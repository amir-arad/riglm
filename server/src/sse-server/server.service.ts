import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { getServerEntityById } from "../entities/server";

import {
  SSEClientTransport,
  SseError,
} from "@modelcontextprotocol/sdk/client/sse.js";
import * as entityModel from "../entities/entity.model";
import { logger } from "../etc/logger";
import { makeServicesContainer } from "../etc/service";

/**
 * Creates a service container for managing server connections.
 * @param sessionId - The session ID for the connection
 * @returns A service container for managing server connections for this session
 */
export const sessionServerConnections = (sessionId: string) =>
  makeServicesContainer(makeServerConnection(sessionId));

const makeServerConnection =
  (sessionId: string) => async (serverId: string) => {
    const serverEntity = await getServerEntityById(serverId);
    if (!serverEntity) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    const transport = createTransport({
      transportType: "sse",
      url: serverEntity.url,
      headers: Object.fromEntries(
        serverEntity.headers.map(({ name, value }) => [name, value])
      ),
    });
    const client = new Client(
      {
        name: "abc-bridge-" + sessionId,
        version: "0.0.1",
      },
      {}
    );
    try {
      await client.connect(transport);
      logger.info("Connected to server:", serverId, "sessionId:", sessionId);
      const { tools } = await client.listTools();
      logger.info("Tools:", tools);
      await entityModel.update("server", serverId, {
        status: "active",
        error: null,
        tools,
        lastConnected: new Date().toISOString(),
      });
      return {
        serverId,
        serverEntity,
        client,
        tools,
        close: async () => {
          await client.close();
          logger.info(
            "Closed connection to server:",
            serverId,
            "sessionId:",
            sessionId
          );
        },
      };
    } catch (error) {
      let errorMessage =
        error instanceof Error ? error.message : "Unknown Connection Error";
      if (error instanceof SseError && error.code === 401) {
        errorMessage =
          "Received 401 Unauthorized from MCP server: " + error.message;
      }
      logger.error("Error connecting to server:", errorMessage, error);
      await entityModel.update("server", serverId, {
        status: "error",
        error: errorMessage,
        tools: [],
      });
      throw error;
    }
  };

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
