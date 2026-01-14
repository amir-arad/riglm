/**
 * MCP Server Adapter - Wraps MCP SDK Server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  McpServerPort,
  McpServerFactory,
  McpServerConfig,
  RequestContext,
  ListToolsResponse,
  CallToolHandlerRequest,
} from "../../ports/mcp-server.port";
import { SdkTransportPort, TransportPort } from "../../ports/transport.port";
import { ToolResponse } from "../../domain/types";

/**
 * Adapter for MCP Server.
 * Wraps the MCP SDK Server class.
 */
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
        // Return SDK-compatible format
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
        );
        // Return SDK-compatible format - cast to any to satisfy SDK types
        return result as any;
      }
    );
  }

  setErrorHandler(handler: (error: Error) => void): void {
    this.server.onerror = handler;
  }

  async close(): Promise<void> {
    await this.server.close();
  }

  /**
   * Extract SDK transport from our adapter
   */
  private getSdkTransport(transport: TransportPort): unknown {
    if ("getSdkTransport" in transport) {
      return (transport as SdkTransportPort).getSdkTransport();
    }
    return transport;
  }

  /**
   * Check if request was cancelled
   */
  private checkSignal(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new McpError(
        ErrorCode.ConnectionClosed,
        "Request was cancelled by the client"
      );
    }
  }
}

/**
 * Factory for creating MCP server instances
 */
export class McpServerFactoryAdapter implements McpServerFactory {
  create(config: McpServerConfig): McpServerPort {
    return new McpServerAdapter(config);
  }
}

/**
 * Create an MCP error for use in handlers
 */
export function createMcpError(code: "InvalidRequest" | "MethodNotFound" | "ConnectionClosed", message: string): Error {
  const errorCodes = {
    InvalidRequest: ErrorCode.InvalidRequest,
    MethodNotFound: ErrorCode.MethodNotFound,
    ConnectionClosed: ErrorCode.ConnectionClosed,
  };
  return new McpError(errorCodes[code], message);
}
