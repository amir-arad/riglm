/**
 * Config Resolver - Pure domain logic for configuration validation and resolution
 * NO EXTERNAL DEPENDENCIES
 */

import {
  Config,
  Filters,
  Identifier,
  ServerConfig,
  EndpointConfig,
  isLocalServer,
  isRemoteServer,
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
// Validation Functions
// ============================================================================

/**
 * Validate an identifier matches the required pattern
 * @param name The identifier to validate
 * @throws Error if identifier is invalid
 */
export function validateIdentifier(name: string): asserts name is Identifier {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid identifier "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
}

/**
 * Validate that filters is an array of strings
 * @param filters The filters value to validate
 * @param context Description of where the filters are defined (for error messages)
 * @throws Error if filters are invalid
 */
function validateFilters(filters: unknown, context: string): void {
  if (
    !Array.isArray(filters) ||
    !filters.every((p) => typeof p === "string")
  ) {
    throw new Error(`The filters in ${context} must be an array of strings`);
  }
}

/**
 * Validate a complete configuration object
 * @param config Unknown configuration object to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: unknown): asserts config is Config {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error("Configuration must be a non-null object");
  }

  const cfg = config as Config;

  // Validate required sections exist
  if (!cfg.servers || typeof cfg.servers !== "object") {
    throw new Error('Configuration must contain a "servers" object');
  }
  if (!cfg.endpoints || typeof cfg.endpoints !== "object") {
    throw new Error('Configuration must contain an "endpoints" object');
  }

  // Validate global filters if present
  if (cfg.filters) {
    validateFilters(cfg.filters, "global configuration");
  }

  // Validate servers
  for (const [serverName, server] of Object.entries(cfg.servers)) {
    validateIdentifier(serverName);

    if (!isLocalServer(server) && !isRemoteServer(server)) {
      throw new Error(
        `Server "${serverName}" must be either a local or remote server configuration`
      );
    }

    if (server.filters) {
      validateFilters(server.filters, `server "${serverName}"`);
    }
  }

  // Validate endpoints
  for (const [endpointName, endpoint] of Object.entries(cfg.endpoints)) {
    validateIdentifier(endpointName);

    if (!Array.isArray(endpoint.servers) || endpoint.servers.length === 0) {
      throw new Error(
        `Endpoint "${endpointName}" must contain a non-empty "servers" array`
      );
    }

    // Validate all referenced servers exist
    for (const serverName of endpoint.servers) {
      if (!cfg.servers[serverName]) {
        throw new Error(
          `Endpoint "${endpointName}" references non-existent server "${serverName}"`
        );
      }
    }

    if (endpoint.filters) {
      validateFilters(endpoint.filters, `endpoint "${endpointName}"`);
    }
  }
}
