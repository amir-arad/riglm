import {
  CallToolRequest,
  ConnectOptions,
  ListToolsResult,
  McpClientPort,
  RequestOptions,
} from "../../ports/mcp-client.port";
import { SdkTransportPort, TransportPort } from "../../ports/transport.port";
import { ToolDefinition, ToolResponse } from "../../domain/tool-aggregator";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

function getSdkTransport(transport: TransportPort): unknown {
  if ("getSdkTransport" in transport) {
    return (transport as SdkTransportPort).getSdkTransport();
  }
  return transport;
}

export function createMcpClientAdapter(
  name: string,
  version: string,
): McpClientPort {
  const client = new Client({ name, version }, {});

  return {
    async connect(
      transport: TransportPort,
      options?: ConnectOptions,
    ): Promise<void> {
      const sdkTransport = getSdkTransport(transport);
      await client.connect(sdkTransport as Transport, {
        signal: options?.signal,
      });
    },

    async listTools(_options?: RequestOptions): Promise<ListToolsResult> {
      const result = await client.listTools();

      const tools: ToolDefinition[] = result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || "",
        inputSchema: (tool.inputSchema || {}) as Record<string, unknown>,
      }));

      return { tools };
    },

    async callTool(request: CallToolRequest): Promise<ToolResponse> {
      const result = await client.callTool({
        name: request.name,
        arguments: request.arguments,
      });

      return result as ToolResponse;
    },

    async close(): Promise<void> {
      await client.close();
    },
  };
}
