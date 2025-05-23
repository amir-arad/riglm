import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { JSONSchema7 } from "json-schema";
import { SessionBackends } from "../backend.service";
import { ApiError } from "../etc/error";
import { FilterEngine } from "../etc/filter";
import { logger as defaultLogger } from "../etc/logger";
import { ToolDefinition, ToolHandler } from "../etc/mcp-schema";
import { makeServicesContainer, ServiceOptions } from "../etc/service";
import { ServerConfigurator } from "../server";
import { TransportSessionManager } from "./transport-session-manager";

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
  const logger = options?.logger || defaultLogger;
  type ToolEntry = [ToolDefinition, ToolHandler];

  // Cache for FilterEngine instances based on filter patterns
  const filterEngineCache = new Map<string, FilterEngine>();

  // Helper to get or create a FilterEngine instance
  function getFilterEngine(serverName: string): FilterEngine {
    const config = configManager.get();
    const serverConfig = config.servers[serverName];
    const serverFilters = serverConfig?.filters || [];
    const globalFilters = config.filters || [];
    const patterns = [
      ...globalFilters,
      ...serverFilters.map((f) => namespace(serverName, f)),
    ];

    if (!patterns.length) {
      return new FilterEngine([]);
    }

    const key = patterns.sort().join(",");
    let engine = filterEngineCache.get(key);
    if (!engine) {
      engine = new FilterEngine(patterns);
      filterEngineCache.set(key, engine);
    }
    return engine;
  }

  function namespace(serverName: string, toolName: string) {
    // serverName should never have dashes, it is enforced in the config schema
    return `${serverName.replace("-", "")}-${toolName}`;
  }

  const endpoint = configManager.get().endpoints[name];
  if (!endpoint) {
    throw ApiError.notFound(`Endpoint "${name}" not found`);
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
        const serverFilterEngine = getFilterEngine(serverName);

        // Include all tools from this server
        for (const remoteTool of target.tools) {
          // Create hierarchically namespaced tool name by prepending server ID
          // This preserves any existing namespacing from downstream servers
          // complies with URI namespace hierarchy conventions
          const namespacedToolName = namespace(serverName, remoteTool.name);
          // Skip if filtered by either server-specific or global filters
          if (serverFilterEngine.shouldFilter(namespacedToolName)) {
            logger.debug(`Filtered tool ${namespacedToolName}`);
            continue;
          }

          toolEntries.push([
            {
              name: namespacedToolName, // Use namespaced name for external exposure
              description: remoteTool.description || "",
              inputSchema: (remoteTool.inputSchema || {}) as JSONSchema7,
            },
            async function (args: Record<string, unknown> | undefined) {
              logger.debug(
                `CALLING DOWNSTREAM TOOL: ${remoteTool.name} with args:`,
                JSON.stringify(args)
              );
              const result = (await target.client.callTool({
                name: remoteTool.name, // Use original name when calling remote server
                arguments: args,
              })) as CallToolResult; // Explicitly assert the type
              logger.debug(
                `RAW RESULT FROM DOWNSTREAM: ${JSON.stringify(result)}`
              );
              return result;
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

  async function createSession(transport: Transport, options?: ServiceOptions) {
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
    createSession,
    status: () => ({
      status: "ok",
      activeSessions: tsm.getActiveSessions(),
    }),
    hostSessions,
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
