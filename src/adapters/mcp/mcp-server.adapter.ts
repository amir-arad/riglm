import {
  CallToolHandlerRequest,
  ListToolsResponse,
  McpServerConfig,
  McpServerPort,
  RequestContext,
} from "../../ports/mcp-server.port";
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { SdkTransportPort, TransportPort } from "../../ports/transport.port";

import { Infer } from "zod/v4";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ToolResponse } from "../../domain/tool-aggregator";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

function getSdkTransport(transport: TransportPort): unknown {
  if ("getSdkTransport" in transport) {
    return (transport as SdkTransportPort).getSdkTransport();
  }
  return transport;
}

function checkSignal(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new McpError(
      ErrorCode.ConnectionClosed,
      "Request was cancelled by the client",
    );
  }
}

export function createMcpServerAdapter(config: McpServerConfig): McpServerPort {
  const server = new Server(
    {
      name: config.name,
      description: config.description,
      version: config.version,
    },
    {
      capabilities: config.capabilities,
    },
  );

  return {
    async connect(transport: TransportPort): Promise<void> {
      const sdkTransport = getSdkTransport(transport);
      await server.connect(sdkTransport as Transport);
    },

    setListToolsHandler(
      handler: (context: RequestContext) => Promise<ListToolsResponse>,
    ): void {
      server.setRequestHandler(
        ListToolsRequestSchema,
        async (_, { signal, sessionId }) => {
          checkSignal(signal);
          if (!sessionId) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "Session ID is required",
            );
          }
          const result = await handler({ signal, sessionId });

          return { tools: result.tools };
        },
      );
    },

    setCallToolHandler(
      handler: (
        request: CallToolHandlerRequest,
        context: RequestContext,
      ) => Promise<ToolResponse>,
    ): void {
      server.setRequestHandler(
        CallToolRequestSchema,
        async (request, { signal, sessionId }) => {
          checkSignal(signal);
          if (!sessionId) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "Session ID is required",
            );
          }
          const result = (await handler(
            {
              name: request.params.name,
              arguments: request.params.arguments,
            },
            { signal, sessionId },
          )) as Infer<typeof CallToolResultSchema>;
          return result;
        },
      );
    },

    setErrorHandler(handler: (error: Error) => void): void {
      server.onerror = handler;
    },

    async notifyToolsListChanged(): Promise<void> {
      await server.sendToolListChanged();
    },

    async close(): Promise<void> {
      await server.close();
    },
  };
}
