import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  CallToolResultSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ServerResponse } from "http";
import { JSONSchema7 } from "json-schema";
import { getContextEntityById } from "../entities/context";
import { getEndpointEntityByName } from "../entities/endpoint";
import { logger } from "../etc/logger";
import { makeServicesContainer } from "../etc/service";
import { sessionServerConnections } from "../sse-server/server.service";
import { TransportSessionManager } from "./transport-session-manager";
import { ToolDefinition, ToolHandler } from "./types";

export const endpointServices = makeServicesContainer(makeEndpointService);

async function makeEndpointService(name: string) {
  type ToolEntry = [ToolDefinition, ToolHandler];
  const mcpServer = new Server(
    {
      name,
      description: "abc Endpoint " + name,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
    }
  );
  const tsm = new TransportSessionManager(mcpServer, {
    inactivityThreshold: 30 * 60 * 1000,
    cleanupInterval: 5 * 60 * 1000,
  });

  const appSessions = makeServicesContainer(async (sessionId: string) => {
    const proxyConnections = sessionServerConnections(sessionId);
    const endpointEntity = await getEndpointEntityByName(name);
    const contexts = await Promise.all(
      endpointEntity.contextIds.map(async (contextId) => {
        const contextEntity = await getContextEntityById(contextId);
        if (!contextEntity) {
          throw new Error(`Context with ID ${contextId} not found`);
        }
        return contextEntity;
      })
    );
    const serverIds = Array.from(
      new Set(
        contexts.flatMap((context) =>
          context.tools.map((tool) => tool.serverId)
        )
      )
    );
    const proxyTargets = new Map(
      (await Promise.all(serverIds.map(proxyConnections.get))).map((s) => [
        s.serverId,
        s,
      ])
    );
    const toolEntries = contexts.flatMap((context) =>
      context.tools.map((tool) => {
        const target = proxyTargets.get(tool.serverId);
        if (!target) {
          throw new Error(`Server with ID ${tool.serverId} not found`);
        }
        // TODO if (tool.originalName === '*')
        const remoteTool = target.tools.find(
          (t) => t.name === tool.originalName
        );
        if (!remoteTool) {
          throw new Error(
            `Server ${tool.serverId} does not have tool ${tool.originalName}`
          );
        }
        return [
          {
            name: tool.exposedName,
            description: tool.description || remoteTool.description || "",
            inputSchema: (remoteTool.inputSchema || {}) as JSONSchema7, // TODO tool.inputSchema || remoteTool.inputSchema,
          },
          async function (args: Record<string, unknown> | undefined) {
            return target.client.callTool(
              {
                name: tool.originalName,
                arguments: args,
              },
              CallToolResultSchema
            ) as Promise<CallToolResult>;
          },
        ] satisfies ToolEntry;
      })
    );

    return {
      tools: toolEntries.map(([tool]) => tool),
      toolHandlers: new Map(
        toolEntries.map(([tool, handler]) => [tool.name, handler])
      ),
      proxyConnections,
      close: async () => {
        logger.info("Closing app session");
      },
    };
  });

  async function initSession(endpoint: string, res: ServerResponse) {
    const transportSession = await tsm.createSession(endpoint, res);
    const { sessionId } = transportSession;
    const appSession = await appSessions.get(sessionId);
    transportSession.addService(
      "proxyConnections",
      appSession.proxyConnections
    );
    transportSession.addService("appSession", appSession);
    return sessionId;
  }

  mcpServer.setRequestHandler(
    ListToolsRequestSchema,
    async (_, { signal, sessionId }) => {
      checkSignal(signal);
      if (!sessionId) {
        throw new McpError(ErrorCode.InvalidRequest, "Session ID is required");
      }
      const appSession = await appSessions.get(sessionId);
      return { tools: appSession.tools };
    }
  );

  mcpServer.setRequestHandler(
    CallToolRequestSchema,
    async (request, { signal, sessionId }) => {
      checkSignal(signal);
      if (!sessionId) {
        throw new McpError(ErrorCode.InvalidRequest, "Session ID is required");
      }
      const appSession = await appSessions.get(sessionId);
      const handler = appSession.toolHandlers.get(request.params.name);
      if (!handler) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
      return handler(request.params.arguments);
    }
  );
  mcpServer.onerror = (error) => logger.error("[MCP Error]", error);

  return {
    endpointId: name,
    hasSession: tsm.hasSession,
    getSession: tsm.getSession,
    removeSession: tsm.removeSession,
    createSession: initSession,
    status: () => ({
      status: "ok",
      activeSessions: tsm.getActiveSessions(),
    }),
    close: async () => {
      await tsm.close();
      await mcpServer.close();
    },
  };
}

export type EndpointService = Awaited<ReturnType<typeof makeEndpointService>>;

function checkSignal(signal: AbortSignal) {
  if (signal.aborted) {
    throw new McpError(
      ErrorCode.ConnectionClosed,
      "Request was cancelled by the client"
    );
  }
}
