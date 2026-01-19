

import {
  CallToolHandlerRequest,
  ListToolsResponse,
  McpServerConfig,
  McpServerFactory,
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


export class McpServerAdapter implements McpServerPort {
  private server: Server;

  constructor(config: McpServerConfig) {
    this.server = new Server(
      {
        name: config.name,
        description: config.description,
        version: config.version,
      },
      {
        capabilities: config.capabilities,
      }
    );
  }

  async connect(transport: TransportPort): Promise<void> {
    const sdkTransport = this.getSdkTransport(transport);
    await this.server.connect(sdkTransport as Transport);
  }

  setListToolsHandler(
    handler: (context: RequestContext) => Promise<ListToolsResponse>
  ): void {
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async (_, { signal, sessionId }) => {
        this.checkSignal(signal);
        if (!sessionId) {
          throw new McpError(ErrorCode.InvalidRequest, "Session ID is required");
        }
        const result = await handler({ signal, sessionId });
        
        return { tools: result.tools };
      }
    );
  }

  setCallToolHandler(
    handler: (
      request: CallToolHandlerRequest,
      context: RequestContext
    ) => Promise<ToolResponse>
  ): void {
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, { signal, sessionId }) => {
        this.checkSignal(signal);
        if (!sessionId) {
          throw new McpError(ErrorCode.InvalidRequest, "Session ID is required");
        }
        const result = await handler(
          {
            name: request.params.name,
            arguments: request.params.arguments,
          },
          { signal, sessionId }
        ) as Infer<typeof CallToolResultSchema>;
        return result;
      }
    );
  }

  setErrorHandler(handler: (error: Error) => void): void {
    this.server.onerror = handler;
  }

  async close(): Promise<void> {
    await this.server.close();
  }

  
  private getSdkTransport(transport: TransportPort): unknown {
    if ("getSdkTransport" in transport) {
      return (transport as SdkTransportPort).getSdkTransport();
    }
    return transport;
  }

  
  private checkSignal(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new McpError(
        ErrorCode.ConnectionClosed,
        "Request was cancelled by the client"
      );
    }
  }
}


export class McpServerFactoryAdapter implements McpServerFactory {
  create(config: McpServerConfig): McpServerPort {
    return new McpServerAdapter(config);
  }
}
