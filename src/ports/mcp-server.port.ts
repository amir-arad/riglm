import { ToolDefinition, ToolResponse } from "../domain/tool-aggregator";
import { TransportPort } from "./transport.port";

export interface McpServerPort {
  connect(transport: TransportPort): Promise<void>;

  setListToolsHandler(
    handler: (context: RequestContext) => Promise<ListToolsResponse>,
  ): void;

  setCallToolHandler(
    handler: (
      request: CallToolHandlerRequest,
      context: RequestContext,
    ) => Promise<ToolResponse>,
  ): void;

  setErrorHandler(handler: (error: Error) => void): void;

  close(): Promise<void>;
}

export interface RequestContext {
  signal: AbortSignal;

  sessionId: string;
}

export interface ListToolsResponse {
  tools: ToolDefinition[];
}

export interface CallToolHandlerRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpServerConfig {
  name: string;

  description?: string;

  version: string;

  capabilities?: {
    tools?: {
      listChanged?: boolean;
    };
  };
}

export type McpServerFactory = (config: McpServerConfig) => McpServerPort;
