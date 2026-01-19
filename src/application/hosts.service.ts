import { BackendConnection, SessionBackendsFactory } from "./backend.service";
import { Closeable, CloseablePool, PoolContext, createCloseablePool } from "../etc/closeable";
import { McpServerFactory, RequestContext } from "../ports/mcp-server.port";
import {
  ToolDefinition,
  ToolHandler,
  ToolResponse,
} from "../domain/tool-aggregator";
import {
  TransportSession,
  TransportSessionManager,
} from "./transport-session-manager";

import { ApiError } from "../domain/error";
import { ConfiguratorPort } from "../ports/config-storage.port";
import { FilterEngine } from "../domain/filter-engine";
import { LoggerPort } from "../ports/logger.port";
import { ToolAggregator } from "../domain/tool-aggregator";
import { TransportPort } from "../ports/transport.port";
import { version } from "../cli/output/version";

interface HostSession {
  tools: ToolDefinition[];
  toolHandlers: Map<string, ToolHandler>;
  close: () => Promise<void>;
}

export interface HostsServiceDeps {
  serverFactory: McpServerFactory;
  config: ConfiguratorPort;
  logger: LoggerPort;
  sessionBackends: SessionBackendsFactory;
}

export interface HostsService {
  endpointId: string;
  hasSession: (sessionId: string) => boolean;
  getSession: (sessionId: string) => TransportSession | undefined;
  removeSession: (sessionId: string) => Promise<void>;
  createSession: (
    transport: TransportPort,
    ctx?: PoolContext,
  ) => Promise<string>;
  status: () => { status: string; activeSessions: number };
  close: () => Promise<void>;
}

export function createHostsServiceFactory(deps: HostsServiceDeps) {
  const { serverFactory, config, logger, sessionBackends } = deps;
  return createCloseablePool(
    async (endpointId) => {
      const endpoint = config.get().endpoints[endpointId];
      if (!endpoint) {
        throw ApiError.notFound(`Endpoint "${endpointId}" not found`);
      }

      const mcpServer = serverFactory({
        name: `riglm-bridge-${endpointId}`,
        description: endpoint.description || `Endpoint ${endpointId}`,
        version: version,
        capabilities: { tools: { listChanged: true } },
      });

      const tsm = new TransportSessionManager(logger);

      const filterEngineCache = new Map<string, FilterEngine>();

      function getFilterEngine(serverName: string): FilterEngine {
        const currentConfig = config.get();
        const serverConfig = currentConfig.servers[serverName];
        const serverFilters = serverConfig?.filters || [];
        const globalFilters = currentConfig.filters || [];

        const patterns = [
          ...globalFilters,
          ...serverFilters.map((f) => ToolAggregator.namespace(serverName, f)),
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

      async function createHostSession(
        sessionId: string,
        ctx?: PoolContext,
      ): Promise<HostSession> {
        const backends = sessionBackends(sessionId, ctx);
        const serverNames = endpoint.servers;

        const connections: BackendConnection[] = await Promise.all(
          serverNames.map((name) => backends.get(name, ctx)),
        );

        const serverData = connections.map((conn) => ({
          serverName: conn.serverName,
          tools: conn.tools,
          filterEngine: getFilterEngine(conn.serverName),
        }));

        const aggregatedTools = ToolAggregator.aggregateTools(serverData);

        const toolHandlers = new Map<string, ToolHandler>();
        for (const conn of connections) {
          for (const tool of conn.tools) {
            const namespacedName = ToolAggregator.namespace(
              conn.serverName,
              tool.name,
            );
            toolHandlers.set(namespacedName, async (args) => {
              logger.debug(
                `CALLING DOWNSTREAM TOOL: ${tool.name} with args:`,
                JSON.stringify(args),
              );
              const result = await conn.client.callTool({
                name: tool.name,
                arguments: args,
              });
              logger.debug(`RAW RESULT FROM DOWNSTREAM: ${JSON.stringify(result)}`);
              return result;
            });
          }
        }

        return {
          tools: aggregatedTools,
          toolHandlers,
          close: async () => {
            logger.info("Closing host session");
            await backends.close();
          },
        };
      }

      const hostSessions = createCloseablePool(
        createHostSession,
        `HostSession`,
        logger,
      );

      async function createSession(
        transport: TransportPort,
        ctx?: PoolContext,
      ): Promise<string> {
        const transportSession = tsm.createSession(transport, ctx);
        const { sessionId } = transportSession;

        await mcpServer.connect(transport);
        logger.info(`New session ${sessionId} for endpoint ${endpointId}`);

        const hostSession = await hostSessions.get(sessionId, ctx);

        transportSession.addService("hostSession", hostSession);

        return sessionId;
      }

      mcpServer.setListToolsHandler(async (ctx: RequestContext) => {
        const session = await hostSessions.get(ctx.sessionId, {
          signal: ctx.signal,
        });
        return { tools: session.tools };
      });

      mcpServer.setCallToolHandler(
        async (request, ctx: RequestContext): Promise<ToolResponse> => {
          const session = await hostSessions.get(ctx.sessionId, {
            signal: ctx.signal,
          });
          const handler = session.toolHandlers.get(request.name);
          if (!handler) {
            throw new Error(`Unknown tool: ${request.name}`);
          }
          return handler(request.arguments);
        },
      );

      mcpServer.setErrorHandler((error) => logger.error("[MCP Error]", error));

      return {
        endpointId,
        hasSession: tsm.hasSession,
        getSession: tsm.getSession,
        removeSession: tsm.removeSession,
        createSession,
        status: () => ({
          status: "ok",
          activeSessions: tsm.getActiveSessions(),
        }),
        close: async () => {
          await tsm.close();
          await hostSessions.close();
          await mcpServer.close();
        },
      };
    },
    `HostsService`,
    deps.logger,
  );
}
