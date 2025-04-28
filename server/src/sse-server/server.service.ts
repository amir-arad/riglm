import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { spawn, ChildProcess } from "child_process";
import {
  SSEClientTransport,
  SseError,
} from "@modelcontextprotocol/sdk/client/sse.js";
import { getCurrentConfig, isLocalServer, isRemoteServer } from "../config";
import { logger } from "../etc/logger";
import { makeServicesContainer } from "../etc/service";

/**
 * Creates a service container for managing server connections.
 * @param sessionId - The session ID for the connection
 * @returns A service container for managing server connections for this session
 */
export const sessionServerConnections = (sessionId: string) =>
  makeServicesContainer(makeServerConnection(sessionId));

// Map to keep track of local server processes
const localServerProcesses = new Map<string, ChildProcess>();

const makeServerConnection =
  (sessionId: string) => async (serverName: string) => {
    const config = getCurrentConfig();
    const serverConfig = config.servers[serverName];

    if (!serverConfig) {
      throw new Error(`Server "${serverName}" not found in configuration`);
    }

    let transport;

    if (isLocalServer(serverConfig)) {
      // Handle local server
      transport = await setupLocalServer(serverName, serverConfig);
    } else if (isRemoteServer(serverConfig)) {
      // Handle remote server
      transport = createTransport({
        transportType: "sse",
        url: serverConfig.url,
        headers: serverConfig.headers || {},
      });
    } else {
      throw new Error(`Invalid server configuration for "${serverName}"`);
    }

    const client = new Client(
      {
        name: "abc-bridge-" + sessionId,
        version: "0.0.1",
      },
      {}
    );

    try {
      await client.connect(transport);
      logger.info(
        `Connected to server: ${serverName}, sessionId: ${sessionId}`
      );
      const { tools } = await client.listTools();
      logger.info(`Discovered tools from ${serverName}:`, tools);

      return {
        serverName,
        serverConfig,
        client,
        tools,
        close: async () => {
          await client.close();
          logger.info(
            `Closed connection to server: ${serverName}, sessionId: ${sessionId}`
          );

          // Clean up local server if needed
          if (
            isLocalServer(serverConfig) &&
            localServerProcesses.has(serverName)
          ) {
            const serverProcess = localServerProcesses.get(serverName);
            if (serverProcess) {
              try {
                serverProcess.kill();
                logger.info(
                  `Terminated local server process for ${serverName}`
                );
              } catch (error) {
                logger.error(
                  `Error terminating local server process for ${serverName}:`,
                  error
                );
              }
            }
          }
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

/**
 * Set up a local server by spawning a process based on the configuration.
 * Returns a transport connected to the local server.
 */
async function setupLocalServer(
  serverName: string,
  config: { command: string; args: string[]; env?: Record<string, string> }
) {
  logger.info(
    `Setting up local server "${serverName}" with command: ${config.command} ${config.args.join(" ")}`
  );

  // Check if this server is already running
  if (localServerProcesses.has(serverName)) {
    const existingProcess = localServerProcesses.get(serverName);
    if (existingProcess && !existingProcess.killed) {
      logger.info(`Local server "${serverName}" is already running`);
      // TODO: Return transport connected to existing server
      // For now, we'll assume the server is running on localhost:8080
      // This needs to be configured properly
      return createTransport({
        transportType: "sse",
        url: "http://localhost:8080",
        headers: {},
      });
    }
  }

  // Start a new process
  const serverProcess = spawn(config.command, config.args, {
    env: { ...process.env, ...config.env },
  });

  // Store the process
  localServerProcesses.set(serverName, serverProcess);

  // Log output
  serverProcess.stdout.on("data", (data: Buffer) => {
    logger.info(`[${serverName}] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on("data", (data: Buffer) => {
    logger.error(`[${serverName}] ${data.toString().trim()}`);
  });

  serverProcess.on("error", (error: Error) => {
    logger.error(`Error in local server "${serverName}":`, error);
  });

  serverProcess.on("exit", (code: number | null, signal: string | null) => {
    logger.info(
      `Local server "${serverName}" exited with code ${code} (signal: ${signal})`
    );
    localServerProcesses.delete(serverName);
  });

  // TODO: We need a way to determine when the server is ready and what URL to connect to
  // For now, we'll just wait a bit and assume it's on localhost:8080
  // This needs to be configured properly in a real implementation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return createTransport({
    transportType: "sse",
    url: "http://localhost:8080",
    headers: {},
  });
}

type TransportOptions = {
  transportType: "sse";
  url: string;
  headers?: Record<string, string>;
};

function createTransport(options: TransportOptions) {
  const { transportType } = options;
  if (transportType === "sse") {
    const { url, headers = {} } = options;
    if (!url) {
      throw new Error("SSE transport requires a URL");
    }
    headers["Accept"] = "text/event-stream";

    logger.info(`SSE transport: url=${url}, headers=${Object.keys(headers)}`);

    const transport = new SSEClientTransport(new URL(url), {
      eventSourceInit: {
        fetch: (url, init) => fetch(url, { ...init, headers }),
      },
      requestInit: {
        headers,
      },
    });

    logger.info("Connected to SSE transport");
    return transport;
  } else {
    logger.error(`Invalid transport type: ${transportType}`);
    throw new Error("Invalid transport type specified");
  }
}
