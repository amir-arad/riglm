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
import { logger } from "../etc/logger";
import { makeServicesContainer, ServiceOptions } from "../etc/service";
import { ServerConfigurator } from "../server";
import { SessionBackends } from "../backend.service";
import { TransportSessionManager } from "./transport-session-manager";
import { ToolDefinition, ToolHandler } from "../etc/mcp-schema";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export const makeHostsServiceFactory = (
  sessionBackends: SessionBackends,
  configManager: ServerConfigurator
) =>
  makeServicesContainer(
    (name, options) =>
      makeHostsService(name, sessionBackends, configManager, options),
    `HostsService`
  );

async function makeHostsService(
  name: string,
  sessionBackends: SessionBackends,
  configManager: ServerConfigurator,
  options?: ServiceOptions
) {
  type ToolEntry = [ToolDefinition, ToolHandler];

  const endpoint = configManager.get().endpoints[name];
  if (!endpoint) {
    throw new Error(`Endpoint "${name}" not found in configuration`);
  }

  const mcpServer = new Server(
    {
      name,
      description: endpoint.description || `Endpoint ${name}`,
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

  const tsm = new TransportSessionManager();
  const makeHostSession = async (
    sessionId: string,
    options?: ServiceOptions
  ) => {
    const serversConnections = sessionBackends(sessionId, options);

    // Get contexts from config
    const contexts = endpoint.contexts.map((contextName) => {
      const context = configManager.get().contexts[contextName];
      if (!context) {
        throw new Error(`Context "${contextName}" not found in configuration`);
      }
      return {
        name: contextName,
        ...context,
      };
    });

    // Get all unique server names referenced by contexts
    const serverNames = Array.from(
      new Set(contexts.flatMap((context) => context.servers))
    );

    // Connect to all required servers
    const proxyTargets = new Map(
      (
        await Promise.all(
          serverNames.map((serverName) =>
            serversConnections.get(serverName, options)
          )
        )
      ).map((server) => [server.serverName, server])
    );

    // For each server, retrieve all its tools
    // In the MVP, we expose all tools from all servers in the contexts
    const toolEntries: ToolEntry[] = [];

    for (const context of contexts) {
      for (const serverName of context.servers) {
        const target = proxyTargets.get(serverName);
        if (!target) {
          throw new Error(
            `Server "${serverName}" not found or connection failed`
          );
        }

        // Include all tools from this server
        for (const remoteTool of target.tools) {
          toolEntries.push([
            {
              name: remoteTool.name, // Use original name - no aliasing in MVP
              description: remoteTool.description || "",
              inputSchema: (remoteTool.inputSchema || {}) as JSONSchema7,
            },
            async function (args: Record<string, unknown> | undefined) {
              return target.client.callTool(
                {
                  name: remoteTool.name,
                  arguments: args,
                },
                CallToolResultSchema
              ) as Promise<CallToolResult>;
            },
          ]);
        }
      }
    }

    return {
      tools: toolEntries.map(([tool]) => tool),
      toolHandlers: new Map(
        toolEntries.map(([tool, handler]) => [tool.name, handler])
      ),
      serversConnections,
      close: async () => {
        logger.info("Closing app session");
      },
    };
  };
  const hostSessions = makeServicesContainer(makeHostSession, `HostSession`);

  async function initSession(
    endpoint: string,
    res: ServerResponse,
    options?: ServiceOptions
  ) {
    const transport = new SSEServerTransport(endpoint, res);
    const transportSession = tsm.createSession(transport, options);
    await mcpServer.connect(transport);
    const { sessionId } = transportSession;
    logger.info(`New session ${sessionId} for endpoint ${endpoint}`);
    const appSession = await hostSessions.get(sessionId, options);
    transportSession.addService(
      "serversConnections",
      appSession.serversConnections
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
      const appSession = await hostSessions.get(sessionId, { signal });
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
      const appSession = await hostSessions.get(sessionId, { signal });
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

export type HostsService = Awaited<ReturnType<typeof makeHostsService>>;

function checkSignal(signal: AbortSignal) {
  if (signal.aborted) {
    throw new McpError(
      ErrorCode.ConnectionClosed,
      "Request was cancelled by the client"
    );
  }
}
