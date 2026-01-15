/**
 * Config Resolver - Pure domain logic for configuration validation and resolution
 */

import { z } from "zod";
import {
  Config,
  Filters,
  Identifier,
  ServerConfig,
  EndpointConfig,
  ConfigSchema,
  IdentifierSchema,
} from "./types";

/**
 * Resolves configuration values with proper priority handling.
 * Provides type-safe access to servers, endpoints, and filters.
 */
export class ConfigResolver {
  constructor(private config: Config) {}

  /**
   * Get filters for a specific server with fallback to endpoint and global.
   * Priority: server filters > endpoint filters > global filters
   * @param serverId Optional server identifier
   * @param endpointId Optional endpoint identifier
   * @returns Array of filter patterns
   */
  getFilters(serverId?: Identifier, endpointId?: Identifier): Filters {
    // Server-specific filters have highest priority
    if (serverId) {
      const server = this.config.servers[serverId];
      if (server?.filters) {
        return server.filters;
      }
    }

    // Endpoint-specific filters have medium priority
    if (endpointId) {
      const endpoint = this.config.endpoints[endpointId];
      if (endpoint?.filters) {
        return endpoint.filters;
      }
    }

    // Global filters are the fallback
    return this.config.filters || [];
  }

  /**
   * Get server configuration by ID
   * @param serverId Server identifier
   * @returns Server configuration or undefined
   */
  getServer(serverId: Identifier): ServerConfig | undefined {
    return this.config.servers[serverId];
  }

  /**
   * Get endpoint configuration by ID
   * @param endpointId Endpoint identifier
   * @returns Endpoint configuration or undefined
   */
  getEndpoint(endpointId: Identifier): EndpointConfig | undefined {
    return this.config.endpoints[endpointId];
  }

  /**
   * Get all server names configured for an endpoint
   * @param endpointId Endpoint identifier
   * @returns Array of server identifiers
   */
  getEndpointServers(endpointId: Identifier): Identifier[] {
    const endpoint = this.config.endpoints[endpointId];
    return endpoint?.servers || [];
  }

  /**
   * Get all endpoint identifiers
   * @returns Array of endpoint identifiers
   */
  getEndpointIds(): Identifier[] {
    return Object.keys(this.config.endpoints);
  }

  /**
   * Get all server identifiers
   * @returns Array of server identifiers
   */
  getServerIds(): Identifier[] {
    return Object.keys(this.config.servers);
  }

  /**
   * Get the raw configuration
   * @returns The underlying configuration object
   */
  getConfig(): Config {
    return this.config;
  }
}

// ============================================================================
// Validation Schema with Cross-References
// ============================================================================

/**
 * Extended config schema with cross-reference validation.
 * Validates that:
 * 1. All server/endpoint keys are valid identifiers
 * 2. All endpoint server references point to existing servers
 */
const ValidatedConfigSchema = ConfigSchema.superRefine((config, ctx) => {
  // Validate server identifiers
  for (const serverName of Object.keys(config.servers)) {
    const result = IdentifierSchema.safeParse(serverName);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid server name "${serverName}": ${result.error.issues[0].message}`,
        path: ["servers", serverName],
      });
    }
  }

  // Validate endpoint identifiers and server references
  for (const [endpointName, endpoint] of Object.entries(config.endpoints)) {
    const identResult = IdentifierSchema.safeParse(endpointName);
    if (!identResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid endpoint name "${endpointName}": ${identResult.error.issues[0].message}`,
        path: ["endpoints", endpointName],
      });
    }

    // Validate server references
    for (const serverName of endpoint.servers) {
      if (!config.servers[serverName]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Endpoint "${endpointName}" references non-existent server "${serverName}"`,
          path: ["endpoints", endpointName, "servers"],
        });
      }
    }
  }
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a complete configuration object
 * @param config Unknown configuration object to validate
 * @throws ZodError if configuration is invalid
 */
export function validateConfig(config: unknown): asserts config is Config {
  ValidatedConfigSchema.parse(config);
}

// Export the schema for external use
export { ValidatedConfigSchema };
