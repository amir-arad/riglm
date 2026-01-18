/**
 * MCP Client Port - Abstracts MCP client operations
 * Used by application services to connect to downstream MCP servers.
 */

import { ToolDefinition, ToolResponse } from "../domain/types";
import { TransportPort } from "./transport.port";

/**
 * MCP Client interface for connecting to and interacting with MCP servers.
 * Implementations wrap the MCP SDK Client class.
 */
export interface McpClientPort {
  /**
   * Connect to an MCP server via transport
   * @param transport The transport to use for communication
   * @param options Optional connection options
   */
  connect(transport: TransportPort, options?: ConnectOptions): Promise<void>;

  /**
   * List available tools from connected server
   * @param options Optional request options
   * @returns List of tool definitions
   */
  listTools(options?: RequestOptions): Promise<ListToolsResult>;

  /**
   * Call a tool on the connected server
   * @param request Tool call request with name and arguments
   * @returns Tool execution result
   */
  callTool(request: CallToolRequest): Promise<ToolResponse>;

  /**
   * Close the client connection
   */
  close(): Promise<void>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Options for client connection
 */
export interface ConnectOptions {
  signal?: AbortSignal;
}

/**
 * Options for client requests
 */
export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * Result from listing tools
 */
export interface ListToolsResult {
  tools: ToolDefinition[];
}

/**
 * Request to call a tool
 */
export interface CallToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Factory for creating MCP client instances
 */
export interface McpClientFactory {
  /**
   * Create a new MCP client
   * @param name Client name for identification
   * @param version Client version string
   * @returns New MCP client instance
   */
  create(name: string, version: string): McpClientPort;
}
