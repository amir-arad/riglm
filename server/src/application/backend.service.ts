/**
 * Backend Service - Application layer for MCP client connections
 * Uses ports for all external dependencies
 */

import { setTimeout } from "node:timers/promises";
import { McpClientPort, McpClientFactory } from "../ports/mcp-client.port";
import {
  ClientTransportFactory,
  TransportPort,
} from "../ports/transport.port";
import { ConfiguratorPort } from "../ports/config-storage.port";
import { LoggerPort } from "../ports/logger.port";
import {
  ServerConfig,
  ToolDefinition,
  isLocalServer,
  isRemoteServer,
} from "../domain/types";
import { makeServicesContainer, Services, ServiceOptions } from "../etc/service";

// ============================================================================
// Types
// ============================================================================

/**
 * A connected backend server with its tools
 */
export interface BackendConnection {
  serverName: string;
  serverConfig: ServerConfig;
  client: McpClientPort;
  tools: ToolDefinition[];
  close: () => Promise<void>;
}

/**
 * Dependencies required by the backend service
 */
export interface BackendServiceDeps {
  clientFactory: McpClientFactory;
  transportFactory: ClientTransportFactory;
  config: ConfiguratorPort;
  logger: LoggerPort;
}

/**
 * Factory function signature for creating session backends
 */
export type SessionBackendsFactory = (
  sessionId: string,
  options?: ServiceOptions
) => Services<BackendConnection>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a factory for session backend connections
 */
export function createSessionBackendFactory(
  deps: BackendServiceDeps
): SessionBackendsFactory {
  return (sessionId: string, options?: ServiceOptions) =>
    makeServicesContainer(
      createBackendConnector(sessionId, deps, options),
      `Backend(${sessionId})`
    );
}

/**
 * Create a backend connector function for a specific session
 */
function createBackendConnector(
  sessionId: string,
  deps: BackendServiceDeps,
  sessionOptions?: ServiceOptions
) {
  const { clientFactory, transportFactory, config, logger } = deps;

  return async (
    serverName: string,
    serviceOptions?: ServiceOptions
  ): Promise<BackendConnection> => {
    // Combine signals if both are provided
    const signal =
      serviceOptions?.signal && sessionOptions?.signal
        ? AbortSignal.any([serviceOptions.signal, sessionOptions.signal])
        : serviceOptions?.signal || sessionOptions?.signal;

    const serverConfig = config.get().servers[serverName];

    if (!serverConfig) {
      throw new Error(`Server "${serverName}" not found in configuration`);
    }

    // Create appropriate transport
    const transport = createTransport(
      serverName,
      serverConfig,
      transportFactory,
      logger,
      signal
    );

    // Create and connect client
    const client = clientFactory.create(`abc-bridge-${sessionId}`, "0.0.1");

    try {
      logger.info(
        `Connecting to server: ${serverName}, sessionId: ${sessionId}`
      );

      await connectWithRetry(client, transport, serverName, logger, signal);

      logger.info(
        `Connected to server: ${serverName}, sessionId: ${sessionId}`
      );

      const { tools } = await client.listTools({ signal });
      logger.debug(
        `Discovered ${tools.length} tools from ${serverName}: [${tools.map((t) => t.name).join(", ")}]`
      );

      return {
        serverName,
        serverConfig,
        client,
        tools,
        close: async () => {
          try {
            await client.close();
            logger.info(
              `Closed connection to server: ${serverName}, sessionId: ${sessionId}`
            );
          } catch (error) {
            logger.error(
              `Error closing connection to server ${serverName}:`,
              error
            );
          }
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown Connection Error";
      logger.error(
        `Error connecting to server ${serverName}:`,
        errorMessage,
        error
      );
      throw error;
    }
  };
}

/**
 * Create the appropriate transport for a server configuration
 */
function createTransport(
  serverName: string,
  serverConfig: ServerConfig,
  transportFactory: ClientTransportFactory,
  logger: LoggerPort,
  signal?: AbortSignal
): TransportPort {
  if (isLocalServer(serverConfig)) {
    logger.info(
      `Setting up local stdio transport for "${serverName}" with command: ${serverConfig.command} ${serverConfig.args.join(" ")}`
    );
    return transportFactory.createStdioTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
      signal,
    });
  }

  if (isRemoteServer(serverConfig)) {
    // Check if URL ends with /sse for backward compatibility
    const isSSE = serverConfig.url.endsWith("/sse");
    logger.info(
      `${isSSE ? "SSE" : "HTTP"} transport: url=${serverConfig.url}`
    );

    if (isSSE) {
      return transportFactory.createSseTransport({
        url: serverConfig.url,
        headers: serverConfig.headers,
        signal,
      });
    }

    return transportFactory.createHttpTransport({
      url: serverConfig.url,
      headers: serverConfig.headers,
      signal,
    });
  }

  // TypeScript exhaustiveness check
  serverConfig satisfies never;
  throw new Error(
    `Unhandled server config type: ${JSON.stringify(serverConfig)}`
  );
}

/**
 * Connect to server with retry logic
 */
async function connectWithRetry(
  client: McpClientPort,
  transport: TransportPort,
  serverName: string,
  logger: LoggerPort,
  signal?: AbortSignal,
  maxRetries = 3
): Promise<void> {
  let retries = maxRetries;

  while (retries > 0) {
    try {
      // Create timeout signal
      const timeoutSignal = AbortSignal.timeout(10000);

      // Combine with existing signal if present
      const connectionSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;

      await client.connect(transport, { signal: connectionSignal });
      return;
    } catch (error) {
      if (signal?.aborted) {
        throw new Error("Connection aborted by signal");
      }

      retries--;
      if (retries === 0) {
        logger.error(`Failed to connect to ${serverName} after all retries`);
        throw error;
      }

      logger.warn(
        `Failed to connect to ${serverName}, retrying... (${retries} attempts left)`
      );

      // Wait before retry
      await waitWithSignal(1000, signal);
    }
  }
}

/**
 * Wait for a duration, respecting abort signal
 */
async function waitWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new Error("Wait aborted by signal");
  }

  const delaySignal = AbortSignal.timeout(ms);
  const combinedSignal = signal
    ? AbortSignal.any([signal, delaySignal])
    : delaySignal;

  try {
    await Promise.race([
      setTimeout(ms),
      new Promise((_, reject) => {
        combinedSignal.addEventListener("abort", () => {
          if (signal?.aborted) {
            reject(new Error("Wait aborted by signal"));
          }
        });
      }),
    ]);
  } catch (error) {
    if (signal?.aborted) {
      throw new Error("Connection retry aborted by signal");
    }
    throw error;
  }
}
