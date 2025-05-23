import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  SSEClientTransport,
  SseError,
} from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { type RpcService } from "typed-rpc/server";
import { isLocalServer, isRemoteServer, Server } from "./etc/config-schema";
import { logger } from "./etc/logger";
import { makeServicesContainer, Services, ServiceOptions } from "./etc/service";
import { ServerConfigurator } from "./server";
import { setTimeout } from "node:timers/promises";

export const makeSessionBackendFactory =
  (config: ServerConfigurator) =>
  (sessionId: string, options?: ServiceOptions) =>
    makeServicesContainer(
      makeBackend(sessionId, config, options),
      `Backend(${sessionId})`
    );

const makeBackend =
  (sessionId: string, config: ServerConfigurator, options?: ServiceOptions) =>
  async (serverName: string, serviceOptions?: ServiceOptions) => {
    // Combine signals if both are provided
    const signal =
      serviceOptions?.signal && options?.signal
        ? AbortSignal.any([serviceOptions.signal, options.signal])
        : serviceOptions?.signal || options?.signal;
    const serverConfig = config.get().servers[serverName];

    if (!serverConfig) {
      throw new Error(`Server "${serverName}" not found in configuration`);
    }

    let transport;

    if (isLocalServer(serverConfig)) {
      transport = await setupLocalStdioTransport(
        serverName,
        serverConfig,
        signal
      );
    } else if (isRemoteServer(serverConfig)) {
      transport = createSseTransport({
        url: serverConfig.url,
        headers: serverConfig.headers || {},
        signal,
      });
    } else {
      serverConfig satisfies never; // assure exhaustive check
      throw new Error(
        `Unhandled server config type: ${JSON.stringify(serverConfig)}`
      );
    }

    const client = new Client(
      {
        name: "abc-bridge-" + sessionId,
        version: "0.0.1",
      },
      {}
    );

    try {
      logger.info(
        `Connecting to server: ${serverName}, sessionId: ${sessionId}`
      );

      let retries = 3;
      while (retries > 0) {
        try {
          const resolvedTransport = await Promise.resolve(transport);

          // Create timeout signal
          const timeoutSignal = AbortSignal.timeout(10000);

          // Combine with existing signal if present
          const connectionSignal = signal
            ? AbortSignal.any([signal, timeoutSignal])
            : timeoutSignal;

          await client.connect(resolvedTransport, { signal: connectionSignal });
          break;
        } catch (error) {
          if (signal?.aborted) {
            throw new Error("Connection aborted by signal");
          }

          retries--;
          if (retries === 0) {
            logger.error(
              `Failed to connect to ${serverName} after all retries`
            );
            throw error;
          }
          logger.warn(
            `Failed to connect to ${serverName}, retrying... (${retries} attempts left)`
          );

          // Create delay signal
          const delaySignal = AbortSignal.timeout(1000);
          const retrySignal = signal
            ? AbortSignal.any([signal, delaySignal])
            : delaySignal;

          try {
            await Promise.race([
              setTimeout(1000),
              new Promise((_, reject) => {
                retrySignal.addEventListener("abort", () =>
                  reject(new Error("Retry delay aborted"))
                );
              }),
            ]);
          } catch (error) {
            if (signal?.aborted) {
              throw new Error("Connection retry aborted by signal");
            }
            throw error;
          }
        }
      }

      logger.info(
        `Connected to server: ${serverName}, sessionId: ${sessionId}`
      );

      const { tools } = await client.listTools({ signal });
      logger.debug(
        `Discovered ${tools.length} tools from ${serverName}: [${tools.map((tool) => tool.name).join(", ")}]`
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
          // Local server process cleanup is handled by StdioClientTransport.close()
        },
      };
    } catch (error) {
      let errorMessage =
        error instanceof Error ? error.message : "Unknown Connection Error";
      if (error instanceof SseError && error.code === 401) {
        errorMessage =
          "Received 401 Unauthorized from MCP server: " + error.message;
      }
      logger.error(
        `Error connecting to server ${serverName}:`,
        errorMessage,
        error
      );
      throw error;
    }
  };
export type Backend = Awaited<ReturnType<ReturnType<typeof makeBackend>>>;
export type SessionBackends = (
  sessionId: string,
  options?: ServiceOptions
) => Services<Backend>;
async function setupLocalStdioTransport(
  serverName: string,
  config: { command: string; args: string[]; env?: Record<string, string> },
  signal?: AbortSignal
) {
  logger.info(
    `Setting up local stdio transport for "${serverName}" with command: ${config.command} ${config.args.join(" ")}`
  );

  return new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, v as string])
      ),
      ...config.env,
    },
  });
}

type TransportOptions = {
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function createSseTransport(options: TransportOptions) {
  const { url, headers = {}, signal } = options;
  if (!url) {
    throw new Error("SSE transport requires a URL");
  }
  headers["Accept"] = "text/event-stream";

  logger.info(`SSE transport: url=${url}, headers=${Object.keys(headers)}`);

  const transport = new SSEClientTransport(new URL(url), {
    eventSourceInit: {
      fetch: (url, init) => fetch(url, { ...init, headers, signal }),
    },
    requestInit: {
      headers,
      signal,
    },
  });

  logger.info("Connected to SSE transport");
  return transport;
}

async function connectServerImpl(serverName: string, serverConfig: Server) {
  logger.info(`Connecting to server: ${serverName}`);
  if (!isRemoteServer(serverConfig)) {
    throw new Error(
      `Server "${serverName}" is not a remote server and cannot be connected to directly`
    );
  }

  try {
    const backingServerTransport = (await Promise.race([
      createSseTransport({
        url: serverConfig.url,
        headers: serverConfig.headers || {},
      }),
      setTimeout(10000).then(() =>
        Promise.reject(new Error("Transport creation timeout"))
      ),
      // TODO: use abort signal
    ])) as SSEClientTransport;

    const client = new Client(
      {
        name: "abc-inspector",
        version: "0.0.1",
      },
      {}
    );

    await client.connect(backingServerTransport);
    logger.info(`Connected to server: ${serverName}`);

    const { tools } = await client.listTools();
    logger.debug(
      `Discovered ${tools.length} tools from ${serverName}: [${tools.map((tool) => tool.name).join(", ")}]`
    );

    await client.close();
    logger.info(`Closed connection to server: ${serverName}`);

    return tools;
  } catch (error) {
    let errorMessage =
      error instanceof Error ? error.message : "Unknown Connection Error";

    if (error instanceof SseError && error.code === 401) {
      errorMessage =
        "Received 401 Unauthorized from MCP server: " + error.message;
    }

    logger.error(
      `Error connecting to server ${serverName}:`,
      errorMessage,
      error
    );
    throw error;
  }
}

export const sseServerActions = (config: ServerConfigurator) => ({
  async connectServer(serverName: string) {
    if (!serverName) {
      throw new Error("Server name is required");
    }
    const serverConfig = config.get().servers[serverName];

    if (!serverConfig) {
      throw new Error(`Server "${serverName}" not found in configuration`);
    }
    logger.info(`Connecting to server: ${serverName}`);
    await connectServerImpl(serverName, serverConfig);
    logger.info(`Connected to server: ${serverName}`);
  },
});

export type SseServerActions = RpcService<
  {
    connectServer(serverId: string): Promise<void>;
  },
  void
>;
