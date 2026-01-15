/**
 * Extension domain types - Zod schemas with derived TypeScript types
 * Defines the Extension model for the registry system.
 */

import { z } from "zod";

// ============================================================================
// Zod Schemas
// ============================================================================

/** Local MCP server configuration schema (stdio transport) */
const McpServerLocalConfigSchema = z.object({
  command: z.string().min(1, "command must be a non-empty string"),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
});

/** Remote MCP server configuration schema (SSE/HTTP transport) */
const McpServerRemoteConfigSchema = z.object({
  url: z.string().min(1, "url must be a non-empty string"),
  headers: z.record(z.string()).optional(),
});

/** MCP server config schema - either local or remote */
const McpServerConfigSchema = z.union([
  McpServerLocalConfigSchema,
  McpServerRemoteConfigSchema,
]);

/** Main Extension schema */
const ExtensionSchema = z.object({
  /** Unique identifier (UUID) */
  id: z.string().min(1, "id must be a non-empty string"),
  /** Extension type discriminator */
  type: z.literal("mcp-server"),
  /** Display name */
  name: z.string().min(1, "name must be a non-empty string"),
  /** Optional description */
  description: z.string().optional(),
  /** Whether extension is enabled by default */
  enabled: z.boolean(),
  /** Type-specific configuration */
  config: McpServerConfigSchema,
  /** Tool filter patterns */
  filters: z.array(z.string()).optional(),
  /** Organizational tags */
  tags: z.array(z.string()).optional(),
  /** ISO timestamp of creation */
  createdAt: z.string(),
  /** ISO timestamp of last update */
  updatedAt: z.string(),
});

/** Schema for creating an extension (auto-generated fields omitted) */
const CreateExtensionInputSchema = ExtensionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// Derived Types
// ============================================================================

/** Extension type discriminator - only mcp-server for Phase 1 */
export type ExtensionType = "mcp-server";

/** Local MCP server configuration (stdio transport) */
export type McpServerLocalConfig = z.infer<typeof McpServerLocalConfigSchema>;

/** Remote MCP server configuration (SSE/HTTP transport) */
export type McpServerRemoteConfig = z.infer<typeof McpServerRemoteConfigSchema>;

/** MCP server config - either local or remote */
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

/** Main Extension interface */
export type Extension = z.infer<typeof ExtensionSchema>;

/** Input type for creating an extension (auto-generated fields omitted) */
export type CreateExtensionInput = z.infer<typeof CreateExtensionInputSchema>;

/** Input type for updating an extension (partial, excluding immutable fields) */
export type UpdateExtensionInput = Partial<CreateExtensionInput>;

// ============================================================================
// Type Guards
// ============================================================================

/** Check if config is for a local stdio server */
export function isLocalConfig(config: McpServerConfig): config is McpServerLocalConfig {
  return "command" in config && "args" in config;
}

/** Check if config is for a remote HTTP/SSE server */
export function isRemoteConfig(config: McpServerConfig): config is McpServerRemoteConfig {
  return "url" in config;
}

// ============================================================================
// Validation Functions
// ============================================================================

/** Validate that a value is a valid Extension */
export function validateExtension(ext: unknown): asserts ext is Extension {
  ExtensionSchema.parse(ext);
}

/** Validate that a value is a valid CreateExtensionInput */
export function validateCreateInput(input: unknown): asserts input is CreateExtensionInput {
  CreateExtensionInputSchema.parse(input);
}

// ============================================================================
// Schema Exports (for external use)
// ============================================================================

export {
  ExtensionSchema,
  CreateExtensionInputSchema,
  McpServerConfigSchema,
  McpServerLocalConfigSchema,
  McpServerRemoteConfigSchema,
};
