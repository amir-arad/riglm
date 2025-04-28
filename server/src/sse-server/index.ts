import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  SSEClientTransport,
  SseError,
} from "@modelcontextprotocol/sdk/client/sse.js";
import { getCurrentConfig, isRemoteServer } from "../config";
import { logger } from "../etc/logger";
import { type RpcService } from "typed-rpc/server";

type TransportOptions = {
  transportType: "sse";
  url: string;
  headers?: Record<string, string>;
};

const createTransport = (options: TransportOptions) => {
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
};

export async function connectServer(serverName: string) {
  logger.info(`Connecting to server: ${serverName}`);

  // Get server config from the unified configuration
  const config = getCurrentConfig();
  const serverConfig = config.servers[serverName];

  if (!serverConfig) {
    throw new Error(`Server "${serverName}" not found in configuration`);
  }

  // We only support remote servers for direct connections
  if (!isRemoteServer(serverConfig)) {
    throw new Error(
      `Server "${serverName}" is not a remote server and cannot be connected to directly`
    );
  }

  try {
    const backingServerTransport = createTransport({
      transportType: "sse",
      url: serverConfig.url,
      headers: serverConfig.headers || {},
    });

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
    logger.info(`Tools discovered from ${serverName}:`, tools);

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

export const sseServerActions = {
  async connectServer(serverId: string) {
    if (!serverId) {
      throw new Error("Server ID is required");
    }
    logger.info(`Connecting to server: ${serverId}`);
    await connectServer(serverId);
    // Return void to match the type definition
  },
};

export type SseServerActions = RpcService<
  {
    connectServer(serverId: string): Promise<void>;
  },
  void
>;
