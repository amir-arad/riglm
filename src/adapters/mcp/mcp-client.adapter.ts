

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
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
import { ToolResponse, ToolDefinition } from "../../domain/tool-aggregator";


export class McpClientAdapter implements McpClientPort {
  private client: Client;

  constructor(name: string, version: string) {
    this.client = new Client({ name, version }, {});
  }

  async connect(transport: TransportPort, options?: ConnectOptions): Promise<void> {
    
    const sdkTransport = this.getSdkTransport(transport);
    await this.client.connect(sdkTransport as Transport, {
      signal: options?.signal,
    });
  }

  async listTools(_options?: RequestOptions): Promise<ListToolsResult> {
    
    const result = await this.client.listTools();

    
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

    
    return result as ToolResponse;
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  
  private getSdkTransport(transport: TransportPort): unknown {
    
    if ("getSdkTransport" in transport) {
      return (transport as SdkTransportPort).getSdkTransport();
    }
    
    return transport;
  }
}


export class McpClientFactoryAdapter implements McpClientFactory {
  create(name: string, version: string): McpClientPort {
    return new McpClientAdapter(name, version);
  }
}
