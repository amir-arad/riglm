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
import { getCurrentConfig } from "../config";
import { logger } from "../etc/logger";
import { makeServicesContainer } from "../etc/service";
import { sessionServerConnections } from "../sse-server/server.service";
import { TransportSessionManager } from "./transport-session-manager";
import { ToolDefinition, ToolHandler } from "./types";

export const endpointServices = makeServicesContainer(makeEndpointService);

async function makeEndpointService(name: string) {
  type ToolEntry = [ToolDefinition, ToolHandler];

  // Check if endpoint exists in config
  const config = getCurrentConfig();
  const endpoint = config.endpoints[name];

  if (!endpoint) {
    throw new Error(`Endpoint "${name}" not found in configuration`);
  }

  // Create MCP server
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

  const tsm = new TransportSessionManager(mcpServer, {
    inactivityThreshold: 30 * 60 * 1000,
    cleanupInterval: 5 * 60 * 1000,
  });

  // Create app sessions container
  const appSessions = makeServicesContainer(async (sessionId: string) => {
    const proxyConnections = sessionServerConnections(sessionId);

    // Get contexts from config
    const contexts = endpoint.contexts.map((contextName) => {
      const context = config.contexts[contextName];
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
          serverNames.map((serverName) => proxyConnections.get(serverName))
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
      proxyConnections,
      close: async () => {
        logger.info("Closing app session");
      },
    };
  });

  // Session initialization
  async function initSession(endpoint: string, res: ServerResponse) {
    // Check for API key if configured
    if (config.endpoints[endpoint]?.apiKey) {
      // API key validation would happen here
      // Not implemented in this basic version
    }

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

  // Set up request handlers
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
