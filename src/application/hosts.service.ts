import { BackendConnection, SessionBackendsFactory } from "./backend.service";
import { McpServerFactory, RequestContext } from "../ports/mcp-server.port";
import { PoolContext, createCloseablePool } from "../etc/closeable";
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
  serverOverrides: Map<string, boolean>;
  refreshTools: () => Promise<void>;
  close: () => Promise<void>;
}

export interface HostsServiceDeps {
  serverFactory: McpServerFactory;
  config: ConfiguratorPort;
  logger: LoggerPort;
  sessionBackends: SessionBackendsFactory;
}

export interface SessionInfo {
  sessionId: string;
  endpointId: string;
  createdAt: Date;
  servers: { name: string; enabled: boolean; overridden: boolean }[];
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
  getSessionInfo: (sessionId: string) => Promise<SessionInfo | undefined>;
  listSessions: () => Promise<SessionInfo[]>;
  setServerOverride: (
    sessionId: string,
    serverName: string,
    enabled: boolean | null,
  ) => Promise<boolean>;
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

      function isServerEnabled(
        serverName: string,
        overrides: Map<string, boolean>,
      ): boolean {
        if (overrides.has(serverName)) return overrides.get(serverName)!;
        const disabledServers = endpoint.disabledServers || [];
        return !disabledServers.includes(serverName);
      }

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
        const serverOverrides = new Map<string, boolean>();

        const connections: BackendConnection[] = await Promise.all(
          serverNames.map((name) => backends.get(name, ctx)),
        );

        const session: HostSession = {
          tools: [],
          toolHandlers: new Map(),
          serverOverrides,
          refreshTools: async () => {
            const enabledConns = connections.filter((c) =>
              isServerEnabled(c.serverName, serverOverrides),
            );
            const serverData = enabledConns.map((conn) => ({
              serverName: conn.serverName,
              tools: conn.tools,
              filterEngine: getFilterEngine(conn.serverName),
            }));
            session.tools = ToolAggregator.aggregateTools(serverData);
            session.toolHandlers.clear();
            for (const conn of enabledConns) {
              for (const tool of conn.tools) {
                const namespacedName = ToolAggregator.namespace(
                  conn.serverName,
                  tool.name,
                );
                session.toolHandlers.set(namespacedName, async (args) => {
                  const result = await conn.client.callTool({
                    name: tool.name,
                    arguments: args,
                  });
                  return result;
                });
              }
            }
          },
          close: async () => {
            logger.info("Closing host session");
            await backends.close();
          },
        };

        await session.refreshTools();
        return session;
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

      async function getSessionInfo(
        sessionId: string,
      ): Promise<SessionInfo | undefined> {
        const ts = tsm.getSession(sessionId);
        if (!ts) return undefined;
        const hs = await hostSessions.get(sessionId);
        return {
          sessionId,
          endpointId,
          createdAt: ts.createdAt,
          servers: endpoint.servers.map((name) => ({
            name,
            enabled: isServerEnabled(name, hs.serverOverrides),
            overridden: hs.serverOverrides.has(name),
          })),
        };
      }

      async function listSessions(): Promise<SessionInfo[]> {
        const infos: SessionInfo[] = [];
        for (const sessionId of tsm.getSessionIds()) {
          const info = await getSessionInfo(sessionId);
          if (info) infos.push(info);
        }
        return infos;
      }

      async function setServerOverride(
        sessionId: string,
        serverName: string,
        enabled: boolean | null,
      ): Promise<boolean> {
        if (!endpoint.servers.includes(serverName)) return false;
        const ts = tsm.getSession(sessionId);
        if (!ts) return false;
        const hs = await hostSessions.get(sessionId);
        if (enabled === null) {
          hs.serverOverrides.delete(serverName);
        } else {
          hs.serverOverrides.set(serverName, enabled);
        }
        await hs.refreshTools();
        await mcpServer.notifyToolsListChanged();
        return true;
      }

      return {
        endpointId,
        hasSession: tsm.hasSession,
        getSession: tsm.getSession,
        removeSession: tsm.removeSession,
        createSession,
        getSessionInfo,
        listSessions,
        setServerOverride,
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
