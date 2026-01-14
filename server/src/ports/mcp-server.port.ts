/**
 * MCP Server Port - Abstracts MCP server operations
 * Used by application services to expose aggregated tools to clients.
 */

import { ToolDefinition, ToolResponse } from "../domain/types";
import { TransportPort } from "./transport.port";

/**
 * MCP Server interface for handling incoming MCP client connections.
 * Implementations wrap the MCP SDK Server class.
 */
export interface McpServerPort {
  /**
   * Connect server to a transport
   * @param transport The transport to use for communication
   */
  connect(transport: TransportPort): Promise<void>;

  /**
   * Set handler for ListTools requests
   * @param handler Function to handle list tools requests
   */
  setListToolsHandler(
    handler: (context: RequestContext) => Promise<ListToolsResponse>
  ): void;

  /**
   * Set handler for CallTool requests
   * @param handler Function to handle tool call requests
   */
  setCallToolHandler(
    handler: (
      request: CallToolHandlerRequest,
      context: RequestContext
    ) => Promise<ToolResponse>
  ): void;

  /**
   * Set error handler for server errors
   * @param handler Function to handle errors
   */
  setErrorHandler(handler: (error: Error) => void): void;

  /**
   * Close the server and release resources
   */
  close(): Promise<void>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Context provided with each request
 */
export interface RequestContext {
  /** Abort signal for request cancellation */
  signal: AbortSignal;
  /** Session identifier */
  sessionId: string;
}

/**
 * Response from list tools handler
 */
export interface ListToolsResponse {
  tools: ToolDefinition[];
}

/**
 * Request passed to call tool handler
 */
export interface CallToolHandlerRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Configuration for creating an MCP server
 */
export interface McpServerConfig {
  /** Server name for identification */
  name: string;
  /** Optional description */
  description?: string;
  /** Server version string */
  version: string;
  /** Server capabilities */
  capabilities?: {
    tools?: {
      listChanged?: boolean;
    };
  };
}

/**
 * Factory for creating MCP server instances
 */
export interface McpServerFactory {
  /**
   * Create a new MCP server
   * @param config Server configuration
   * @returns New MCP server instance
   */
  create(config: McpServerConfig): McpServerPort;
}
