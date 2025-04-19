// import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  SSEClientTransport,
  SseError,
} from "@modelcontextprotocol/sdk/client/sse.js";
import * as entityModel from "../entities/entity.model";

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

    console.log(`SSE transport: url=${url}, headers=${Object.keys(headers)}`);

    const transport = new SSEClientTransport(new URL(url), {
      eventSourceInit: {
        fetch: (url, init) => fetch(url, { ...init, headers }),
      },
      requestInit: {
        headers,
      },
    });

    console.log("Connected to SSE transport");
    return transport;
  } else {
    console.error(`Invalid transport type: ${transportType}`);
    throw new Error("Invalid transport type specified");
  }
};

export async function connectServer(serverId: string) {
  console.log("Connecting to server:", serverId);
  const serverEntity = await entityModel.getById("server", serverId);
  if (!serverEntity) {
    return null;
  }
  try {
    const backingServerTransport = createTransport({
      transportType: "sse",
      url: serverEntity.url,
      headers: Object.fromEntries(
        serverEntity.headers.map(
          ({ name, value }: { name: string; value: string }) => [name, value]
        )
      ),
    });
    const client = new Client(
      {
        name: "abc-inspector",
        version: "0.0.1",
      },
      {}
    );
    await client.connect(backingServerTransport);
    console.log("Connected to server:", serverId);
    const { tools } = await client.listTools();
    console.log("Tools:", tools);
    await entityModel.update("server", serverId, {
      status: "active",
      error: null,
      tools,
      lastConnected: new Date().toISOString(),
    });
    await client.close();
    console.log("Closed connection to server:", serverId);
    return tools;
  } catch (error) {
    let errorMessage =
      error instanceof Error ? error.message : "Unknown Connection Error";
    if (error instanceof SseError && error.code === 401) {
      errorMessage =
        "Received 401 Unauthorized from MCP server: " + error.message;
    }
    console.error("Error connecting to server:", errorMessage, error);
    await entityModel.update("server", serverId, {
      status: "error",
      error: errorMessage,
      tools: [],
    });
    return null;
  }
}

export const sseServerActions = {
  async connectServer(serverId: string) {
    try {
      const tools = await connectServer(serverId);
      return tools;
    } catch (error) {
      console.error("Error connecting to server:", error);
      return null;
    }
  },
};
