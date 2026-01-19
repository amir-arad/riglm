

import { ToolDefinition, ToolResponse } from "../domain/tool-aggregator";
import { TransportPort } from "./transport.port";


export interface McpClientPort {
  
  connect(transport: TransportPort, options?: ConnectOptions): Promise<void>;

  
  listTools(options?: RequestOptions): Promise<ListToolsResult>;

  
  callTool(request: CallToolRequest): Promise<ToolResponse>;

  
  close(): Promise<void>;
}






export interface ConnectOptions {
  signal?: AbortSignal;
}


export interface RequestOptions {
  signal?: AbortSignal;
}


export interface ListToolsResult {
  tools: ToolDefinition[];
}


export interface CallToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}






export interface McpClientFactory {
  
  create(name: string, version: string): McpClientPort;
}
