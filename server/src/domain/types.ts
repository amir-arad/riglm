/**
 * Core domain types - NO EXTERNAL DEPENDENCIES
 * This file contains all domain models used throughout the application.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/** Server/endpoint identifier pattern: ^[a-zA-Z_][a-zA-Z0-9_]*$ */
export type Identifier = string;

/** Filter patterns for tool filtering */
export type Filters = string[];

/** Local MCP server configuration (stdio transport) */
export interface LocalServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
  filters?: Filters;
}

/** Remote MCP server configuration (SSE/HTTP transport) */
export interface RemoteServerConfig {
  url: string;
  headers?: Record<string, string>;
  description?: string;
  filters?: Filters;
}

/** Server configuration - either local or remote */
export type ServerConfig = LocalServerConfig | RemoteServerConfig;

/** Endpoint configuration - aggregates multiple servers */
export interface EndpointConfig {
  description?: string;
  servers: Identifier[];
  filters?: Filters;
  apiKey?: string;
}

/** Root application configuration */
export interface Config {
  servers: Record<Identifier, ServerConfig>;
  endpoints: Record<Identifier, EndpointConfig>;
  filters?: Filters;
}

// ============================================================================
// Type Guards
// ============================================================================

/** Check if server config is for a local stdio server */
export function isLocalServer(server: ServerConfig): server is LocalServerConfig {
  return "command" in server && "args" in server;
}

/** Check if server config is for a remote HTTP/SSE server */
export function isRemoteServer(server: ServerConfig): server is RemoteServerConfig {
  return "url" in server;
}

// ============================================================================
// MCP Tool Types
// ============================================================================

/** JSON Schema type for tool input definitions */
export type JsonSchema = Record<string, unknown>;

/** MCP tool definition */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

/** Tool execution response */
export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

/** Union of all possible tool content types */
export type ToolContent =
  | TextContent
  | ImageContent
  | AudioContent
  | ResourceContent;

/** Text content from tool execution */
export interface TextContent {
  type: "text";
  text: string;
}

/** Image content (base64 encoded) */
export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

/** Audio content (base64 encoded) */
export interface AudioContent {
  type: "audio";
  data: string;
  mimeType: string;
}

/** Resource content with URI reference */
export interface ResourceContent {
  type: "resource";
  resource: {
    uri: string;
    text?: string;
    mimeType?: string;
  };
}

/** Handler function signature for tool execution */
export type ToolHandler = (
  args: Record<string, unknown> | undefined
) => Promise<ToolResponse>;

// ============================================================================
// Session Types
// ============================================================================

/** Session metadata */
export interface SessionInfo {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
}

// ============================================================================
// Validation Functions
// ============================================================================

/** Validate that a string is a valid identifier */
export function validateIdentifier(name: string): asserts name is Identifier {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid server name "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
}
