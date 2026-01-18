/**
 * Config Service - CRUD operations for servers and endpoints
 * Manages the application configuration with persistence.
 */

import { z } from "zod";
import type { ConfiguratorPort } from "../ports/config-storage.port";
import type { LoggerPort } from "../ports/logger.port";
import { ApiError } from "../domain/error";
import {
  type Config,
  type ServerConfig,
  type EndpointConfig,
  type Filters,
  IdentifierSchema,
  FiltersSchema,
  isLocalServer,
} from "../domain/types";

// ============================================================================
// Input Schemas for API
// ============================================================================

/** Input for creating a local server */
const CreateLocalServerInputSchema = z.object({
  id: IdentifierSchema,
  type: z.literal("local"),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

/** Input for creating a remote server */
const CreateRemoteServerInputSchema = z.object({
  id: IdentifierSchema,
  type: z.literal("remote"),
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

/** Union of create server inputs */
const CreateServerInputSchema = z.discriminatedUnion("type", [
  CreateLocalServerInputSchema,
  CreateRemoteServerInputSchema,
]);

/** Input for updating a local server (no id, no type change) */
const UpdateLocalServerInputSchema = z.object({
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

/** Input for updating a remote server (no id, no type change) */
const UpdateRemoteServerInputSchema = z.object({
  url: z.string().min(1).optional(),
  headers: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

/** Input for creating an endpoint */
const CreateEndpointInputSchema = z.object({
  id: IdentifierSchema,
  description: z.string().optional(),
  servers: z.array(z.string()).min(1, "Endpoint must have at least one server"),
  filters: FiltersSchema.optional(),
});

/** Input for updating an endpoint (no id change) */
const UpdateEndpointInputSchema = z.object({
  description: z.string().optional(),
  servers: z.array(z.string()).min(1, "Endpoint must have at least one server").optional(),
  filters: FiltersSchema.optional(),
});

/** Input for updating settings */
const UpdateSettingsInputSchema = z.object({
  filters: FiltersSchema.optional(),
});

// ============================================================================
// Types
// ============================================================================

export type CreateServerInput = z.infer<typeof CreateServerInputSchema>;
export type CreateLocalServerInput = z.infer<typeof CreateLocalServerInputSchema>;
export type CreateRemoteServerInput = z.infer<typeof CreateRemoteServerInputSchema>;
export type UpdateLocalServerInput = z.infer<typeof UpdateLocalServerInputSchema>;
export type UpdateRemoteServerInput = z.infer<typeof UpdateRemoteServerInputSchema>;
export type CreateEndpointInput = z.infer<typeof CreateEndpointInputSchema>;
export type UpdateEndpointInput = z.infer<typeof UpdateEndpointInputSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInputSchema>;

/** Server object with ID for API responses */
export interface ServerWithId {
  id: string;
  type: "local" | "remote";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  description?: string;
  filters?: Filters;
}

/** Endpoint object with ID for API responses */
export interface EndpointWithId {
  id: string;
  description?: string;
  servers: string[];
  filters?: Filters;
}

/** Settings object for API responses */
export interface Settings {
  filters: Filters;
}

/** Status object for API responses */
export interface Status {
  status: "ok";
  uptime: number;
  endpoints: Record<string, { status: "ok"; activeSessions: number }>;
  memory: { rss: number; heapUsed: number };
}

/** Delete result with warning if server is in use */
export interface DeleteResult {
  deleted: boolean;
  warning?: string;
  usedBy?: string[];
}

// ============================================================================
// Service Dependencies
// ============================================================================

export interface ConfigServiceDeps {
  config: ConfiguratorPort;
  logger: LoggerPort;
  getSessionCount?: (endpointId: string) => number;
}

// ============================================================================
// ConfigService
// ============================================================================

/**
 * Service for managing configuration with CRUD operations.
 * Provides server and endpoint management with validation.
 */
export class ConfigService {
  private startTime: number;

  constructor(private deps: ConfigServiceDeps) {
    this.startTime = Date.now();
  }

  // --------------------------------------------------------------------------
  // Servers
  // --------------------------------------------------------------------------

  /**
   * List all servers with their IDs
   */
  listServers(): ServerWithId[] {
    const config = this.deps.config.get();
    return Object.entries(config.servers).map(([id, server]) =>
      this.toServerWithId(id, server)
    );
  }

  /**
   * Get a server by ID
   * @throws ApiError 404 if not found
   */
  getServer(id: string): ServerWithId {
    const config = this.deps.config.get();
    const server = config.servers[id];
    if (!server) {
      throw ApiError.notFound(`Server '${id}' not found`, "SERVER_NOT_FOUND");
    }
    return this.toServerWithId(id, server);
  }

  /**
   * Create a new server
   * @throws ApiError 409 if server already exists
   * @throws ApiError 422 if validation fails
   */
  createServer(input: unknown): ServerWithId {
    // Validate input
    const parsed = CreateServerInputSchema.safeParse(input);
    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.errors[0].message,
        "VALIDATION_ERROR",
        parsed.error.errors
      );
    }

    const { id, type, ...rest } = parsed.data;
    const config = this.deps.config.get();

    // Check for duplicate
    if (config.servers[id]) {
      throw ApiError.conflict(`Server '${id}' already exists`, "DUPLICATE_ID");
    }

    // Build server config based on type
    let serverConfig: ServerConfig;
    if (type === "local") {
      const { command, args, env, description, filters } = rest as Omit<CreateLocalServerInput, "id" | "type">;
      serverConfig = { command, args, env, description, filters };
    } else {
      const { url, headers, description, filters } = rest as Omit<CreateRemoteServerInput, "id" | "type">;
      serverConfig = { url, headers, description, filters };
    }

    // Update config
    const newConfig: Config = {
      ...config,
      servers: {
        ...config.servers,
        [id]: serverConfig,
      },
    };

    this.deps.config.save(newConfig);
    this.deps.logger.info(`Created server: ${id}`);

    return this.toServerWithId(id, serverConfig);
  }

  /**
   * Update an existing server
   * @throws ApiError 404 if not found
   * @throws ApiError 422 if validation fails
   */
  updateServer(id: string, input: unknown): ServerWithId {
    const config = this.deps.config.get();
    const existing = config.servers[id];

    if (!existing) {
      throw ApiError.notFound(`Server '${id}' not found`, "SERVER_NOT_FOUND");
    }

    // Validate based on server type
    const isLocal = isLocalServer(existing);
    const schema = isLocal ? UpdateLocalServerInputSchema : UpdateRemoteServerInputSchema;
    const parsed = schema.safeParse(input);

    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.errors[0].message,
        "VALIDATION_ERROR",
        parsed.error.errors
      );
    }

    // Merge with existing
    const updated: ServerConfig = {
      ...existing,
      ...parsed.data,
    };

    // Update config
    const newConfig: Config = {
      ...config,
      servers: {
        ...config.servers,
        [id]: updated,
      },
    };

    this.deps.config.save(newConfig);
    this.deps.logger.info(`Updated server: ${id}`);

    return this.toServerWithId(id, updated);
  }

  /**
   * Delete a server
   * @returns Delete result with warning if server is used by endpoints
   * @throws ApiError 404 if not found
   */
  deleteServer(id: string): DeleteResult {
    const config = this.deps.config.get();

    if (!config.servers[id]) {
      throw ApiError.notFound(`Server '${id}' not found`, "SERVER_NOT_FOUND");
    }

    // Check if server is used by any endpoints
    const usedBy = Object.entries(config.endpoints)
      .filter(([_, endpoint]) => endpoint.servers.includes(id))
      .map(([endpointId]) => endpointId);

    // Remove server from all endpoints that use it
    const updatedEndpoints = { ...config.endpoints };
    for (const endpointId of usedBy) {
      const endpoint = updatedEndpoints[endpointId];
      const remainingServers = endpoint.servers.filter((s) => s !== id);
      if (remainingServers.length === 0) {
        // Delete endpoint if no servers left
        delete updatedEndpoints[endpointId];
      } else {
        updatedEndpoints[endpointId] = {
          ...endpoint,
          servers: remainingServers,
        };
      }
    }

    // Remove server
    const { [id]: _, ...remainingServers } = config.servers;

    const newConfig: Config = {
      ...config,
      servers: remainingServers,
      endpoints: updatedEndpoints,
    };

    this.deps.config.save(newConfig);
    this.deps.logger.info(`Deleted server: ${id}`);

    return {
      deleted: true,
      warning: usedBy.length > 0
        ? `Server was removed from ${usedBy.length} endpoint(s)`
        : undefined,
      usedBy: usedBy.length > 0 ? usedBy : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // Endpoints
  // --------------------------------------------------------------------------

  /**
   * List all endpoints with their IDs
   */
  listEndpoints(): EndpointWithId[] {
    const config = this.deps.config.get();
    return Object.entries(config.endpoints).map(([id, endpoint]) =>
      this.toEndpointWithId(id, endpoint)
    );
  }

  /**
   * Get an endpoint by ID
   * @throws ApiError 404 if not found
   */
  getEndpoint(id: string): EndpointWithId {
    const config = this.deps.config.get();
    const endpoint = config.endpoints[id];
    if (!endpoint) {
      throw ApiError.notFound(`Endpoint '${id}' not found`, "ENDPOINT_NOT_FOUND");
    }
    return this.toEndpointWithId(id, endpoint);
  }

  /**
   * Create a new endpoint
   * @throws ApiError 409 if endpoint already exists
   * @throws ApiError 422 if validation fails or servers don't exist
   */
  createEndpoint(input: unknown): EndpointWithId {
    // Validate input
    const parsed = CreateEndpointInputSchema.safeParse(input);
    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.errors[0].message,
        "VALIDATION_ERROR",
        parsed.error.errors
      );
    }

    const { id, servers, description, filters } = parsed.data;
    const config = this.deps.config.get();

    // Check for duplicate
    if (config.endpoints[id]) {
      throw ApiError.conflict(`Endpoint '${id}' already exists`, "DUPLICATE_ID");
    }

    // Validate all servers exist
    const missingServers = servers.filter((s) => !config.servers[s]);
    if (missingServers.length > 0) {
      throw ApiError.validation(
        `Server(s) not found: ${missingServers.join(", ")}`,
        "SERVERS_NOT_FOUND",
        { missingServers }
      );
    }

    // Build endpoint config
    const endpointConfig: EndpointConfig = {
      servers,
      description,
      filters,
    };

    // Update config
    const newConfig: Config = {
      ...config,
      endpoints: {
        ...config.endpoints,
        [id]: endpointConfig,
      },
    };

    this.deps.config.save(newConfig);
    this.deps.logger.info(`Created endpoint: ${id}`);

    return this.toEndpointWithId(id, endpointConfig);
  }

  /**
   * Update an existing endpoint
   * @throws ApiError 404 if not found
   * @throws ApiError 422 if validation fails or servers don't exist
   */
  updateEndpoint(id: string, input: unknown): EndpointWithId {
    const config = this.deps.config.get();
    const existing = config.endpoints[id];

    if (!existing) {
      throw ApiError.notFound(`Endpoint '${id}' not found`, "ENDPOINT_NOT_FOUND");
    }

    // Validate input
    const parsed = UpdateEndpointInputSchema.safeParse(input);
    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.errors[0].message,
        "VALIDATION_ERROR",
        parsed.error.errors
      );
    }

    // If servers are being updated, validate they exist
    if (parsed.data.servers) {
      const missingServers = parsed.data.servers.filter((s) => !config.servers[s]);
      if (missingServers.length > 0) {
        throw ApiError.validation(
          `Server(s) not found: ${missingServers.join(", ")}`,
          "SERVERS_NOT_FOUND",
          { missingServers }
        );
      }
    }

    // Merge with existing
    const updated: EndpointConfig = {
      ...existing,
      ...parsed.data,
    };

    // Update config
    const newConfig: Config = {
      ...config,
      endpoints: {
        ...config.endpoints,
        [id]: updated,
      },
    };

    this.deps.config.save(newConfig);
    this.deps.logger.info(`Updated endpoint: ${id}`);

    return this.toEndpointWithId(id, updated);
  }

  /**
   * Delete an endpoint
   * @returns Delete result with warning if endpoint has active sessions
   * @throws ApiError 404 if not found
   */
  deleteEndpoint(id: string): DeleteResult {
    const config = this.deps.config.get();

    if (!config.endpoints[id]) {
      throw ApiError.notFound(`Endpoint '${id}' not found`, "ENDPOINT_NOT_FOUND");
    }

    // Check for active sessions
    const sessionCount = this.deps.getSessionCount?.(id) ?? 0;

    // Remove endpoint
    const { [id]: _, ...remainingEndpoints } = config.endpoints;

    const newConfig: Config = {
      ...config,
      endpoints: remainingEndpoints,
    };

    this.deps.config.save(newConfig);
    this.deps.logger.info(`Deleted endpoint: ${id}`);

    return {
      deleted: true,
      warning: sessionCount > 0
        ? `${sessionCount} active session(s) will be disconnected`
        : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------------------

  /**
   * Get global settings
   */
  getSettings(): Settings {
    const config = this.deps.config.get();
    return {
      filters: config.filters ?? [],
    };
  }

  /**
   * Update global settings
   * @throws ApiError 422 if validation fails
   */
  updateSettings(input: unknown): Settings {
    // Validate input
    const parsed = UpdateSettingsInputSchema.safeParse(input);
    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.errors[0].message,
        "VALIDATION_ERROR",
        parsed.error.errors
      );
    }

    const config = this.deps.config.get();
    const newConfig: Config = {
      ...config,
      filters: parsed.data.filters,
    };

    this.deps.config.save(newConfig);
    this.deps.logger.info("Updated global settings");

    return {
      filters: newConfig.filters ?? [],
    };
  }

  // --------------------------------------------------------------------------
  // Status
  // --------------------------------------------------------------------------

  /**
   * Get server status
   */
  getStatus(): Status {
    const config = this.deps.config.get();
    const endpoints: Status["endpoints"] = {};

    for (const id of Object.keys(config.endpoints)) {
      const sessionCount = this.deps.getSessionCount?.(id) ?? 0;
      endpoints[id] = {
        status: "ok",
        activeSessions: sessionCount,
      };
    }

    return {
      status: "ok",
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      endpoints,
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Config Reload
  // --------------------------------------------------------------------------

  /**
   * Reload configuration from file
   * @returns true if reload successful
   */
  reloadConfig(): boolean {
    const success = this.deps.config.reload();
    if (success) {
      this.deps.logger.info("Configuration reloaded from file");
    }
    return success;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private toServerWithId(id: string, server: ServerConfig): ServerWithId {
    if (isLocalServer(server)) {
      return {
        id,
        type: "local",
        command: server.command,
        args: server.args,
        env: server.env,
        description: server.description,
        filters: server.filters,
      };
    } else {
      return {
        id,
        type: "remote",
        url: server.url,
        headers: server.headers,
        description: server.description,
        filters: server.filters,
      };
    }
  }

  private toEndpointWithId(id: string, endpoint: EndpointConfig): EndpointWithId {
    return {
      id,
      description: endpoint.description,
      servers: endpoint.servers,
      filters: endpoint.filters,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a ConfigService instance
 */
export function createConfigService(deps: ConfigServiceDeps): ConfigService {
  return new ConfigService(deps);
}

// ============================================================================
// Schema Exports (for route validation)
// ============================================================================

export {
  CreateServerInputSchema,
  CreateLocalServerInputSchema,
  CreateRemoteServerInputSchema,
  UpdateLocalServerInputSchema,
  UpdateRemoteServerInputSchema,
  CreateEndpointInputSchema,
  UpdateEndpointInputSchema,
  UpdateSettingsInputSchema,
};
