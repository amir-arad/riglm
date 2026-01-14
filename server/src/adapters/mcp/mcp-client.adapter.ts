/**
 * MCP Client Adapter - Wraps MCP SDK Client
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SseError } from "@modelcontextprotocol/sdk/client/sse.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  McpClientPort,
  McpClientFactory,
  ConnectOptions,
  RequestOptions,
  ListToolsResult,
  CallToolRequest,
} from "../../ports/mcp-client.port";
import { SdkTransportPort, TransportPort } from "../../ports/transport.port";
import { ToolResponse, ToolDefinition } from "../../domain/types";

/**
 * Adapter for MCP Client.
 * Wraps the MCP SDK Client class.
 */
export class McpClientAdapter implements McpClientPort {
  private client: Client;

  constructor(name: string, version: string) {
    this.client = new Client({ name, version }, {});
  }

  async connect(transport: TransportPort, options?: ConnectOptions): Promise<void> {
    // Get the SDK transport from the adapter
    const sdkTransport = this.getSdkTransport(transport);
    await this.client.connect(sdkTransport as Transport, {
      signal: options?.signal,
    });
  }

  async listTools(_options?: RequestOptions): Promise<ListToolsResult> {
    // Note: MCP SDK listTools doesn't support signal in params anymore
    const result = await this.client.listTools();

    // Map SDK tools to domain types
    const tools: ToolDefinition[] = result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      inputSchema: (tool.inputSchema || {}) as Record<string, unknown>,
    }));

    return { tools };
  }

  async callTool(request: CallToolRequest): Promise<ToolResponse> {
    const result = await this.client.callTool({
      name: request.name,
      arguments: request.arguments,
    });

    // Map SDK result to domain type
    return result as ToolResponse;
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  /**
   * Extract SDK transport from our adapter
   */
  private getSdkTransport(transport: TransportPort): unknown {
    // Check if transport has getSdkTransport method (our adapters)
    if ("getSdkTransport" in transport) {
      return (transport as SdkTransportPort).getSdkTransport();
    }
    // Fallback: assume it's already an SDK transport
    return transport;
  }
}

/**
 * Factory for creating MCP client instances
 */
export class McpClientFactoryAdapter implements McpClientFactory {
  create(name: string, version: string): McpClientPort {
    return new McpClientAdapter(name, version);
  }
}

/**
 * Check if an error is an SSE authentication error
 */
export function isSseAuthError(error: unknown): boolean {
  return error instanceof SseError && error.code === 401;
}
