/**
 * Core domain types - Zod schemas with derived TypeScript types
 * This file contains all domain models used throughout the application.
 */

import { z } from "zod";

// ============================================================================
// Zod Schemas - Configuration Types
// ============================================================================

/** Identifier pattern: starts with letter/underscore, alphanumeric + underscore */
const IdentifierSchema = z
  .string()
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "Must start with a letter or underscore and contain only letters, numbers, and underscores"
  );

/** Filter patterns for tool filtering */
const FiltersSchema = z.array(z.string());

/** Local MCP server configuration (stdio transport) */
const LocalServerConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

/** Remote MCP server configuration (SSE/HTTP transport) */
const RemoteServerConfigSchema = z.object({
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

/** Server configuration - either local or remote */
const ServerConfigSchema = z.union([
  LocalServerConfigSchema,
  RemoteServerConfigSchema,
]);

/** Endpoint configuration - aggregates multiple servers */
const EndpointConfigSchema = z.object({
  description: z.string().optional(),
  servers: z.array(z.string()).min(1, "Endpoint must have at least one server"),
  filters: FiltersSchema.optional(),
  apiKey: z.string().optional(),
});

/** Root application configuration */
const ConfigSchema = z.object({
  servers: z.record(ServerConfigSchema),
  endpoints: z.record(EndpointConfigSchema),
  filters: FiltersSchema.optional(),
});

// ============================================================================
// Derived Types - Configuration
// ============================================================================

/** Server/endpoint identifier pattern: ^[a-zA-Z_][a-zA-Z0-9_]*$ */
export type Identifier = z.infer<typeof IdentifierSchema>;

/** Filter patterns for tool filtering */
export type Filters = z.infer<typeof FiltersSchema>;

/** Local MCP server configuration (stdio transport) */
export type LocalServerConfig = z.infer<typeof LocalServerConfigSchema>;

/** Remote MCP server configuration (SSE/HTTP transport) */
export type RemoteServerConfig = z.infer<typeof RemoteServerConfigSchema>;

/** Server configuration - either local or remote */
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/** Endpoint configuration - aggregates multiple servers */
export type EndpointConfig = z.infer<typeof EndpointConfigSchema>;

/** Root application configuration */
export type Config = z.infer<typeof ConfigSchema>;

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
// Schema Exports
// ============================================================================

export {
  IdentifierSchema,
  FiltersSchema,
  LocalServerConfigSchema,
  RemoteServerConfigSchema,
  ServerConfigSchema,
  EndpointConfigSchema,
  ConfigSchema,
};

// ============================================================================
// MCP Tool Types (not validated at runtime - from SDK)
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
