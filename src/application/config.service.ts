

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
} from "../domain/config-resolver";






const CreateLocalServerInputSchema = z.object({
  id: IdentifierSchema,
  type: z.literal("local"),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});


const CreateRemoteServerInputSchema = z.object({
  id: IdentifierSchema,
  type: z.literal("remote"),
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});


const CreateServerInputSchema = z.discriminatedUnion("type", [
  CreateLocalServerInputSchema,
  CreateRemoteServerInputSchema,
]);


const UpdateLocalServerInputSchema = z.object({
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});


const UpdateRemoteServerInputSchema = z.object({
  url: z.string().min(1).optional(),
  headers: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});


const CreateEndpointInputSchema = z.object({
  id: IdentifierSchema,
  description: z.string().optional(),
  servers: z.array(z.string()).min(1, "Endpoint must have at least one server"),
  filters: FiltersSchema.optional(),
});


const UpdateEndpointInputSchema = z.object({
  description: z.string().optional(),
  servers: z.array(z.string()).min(1, "Endpoint must have at least one server").optional(),
  filters: FiltersSchema.optional(),
});


const UpdateSettingsInputSchema = z.object({
  filters: FiltersSchema.optional(),
});


type CreateLocalServerInput = z.infer<typeof CreateLocalServerInputSchema>;
type CreateRemoteServerInput = z.infer<typeof CreateRemoteServerInputSchema>;


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


export interface EndpointWithId {
  id: string;
  description?: string;
  servers: string[];
  filters?: Filters;
}


export interface Settings {
  filters: Filters;
}


export interface Status {
  status: "ok";
  uptime: number;
  endpoints: Record<string, { status: "ok"; activeSessions: number }>;
  memory: { rss: number; heapUsed: number };
}


export interface DeleteResult {
  deleted: boolean;
  warning?: string;
  usedBy?: string[];
}





export interface ConfigServiceDeps {
  config: ConfiguratorPort;
  logger: LoggerPort;
  getSessionCount?: (endpointId: string) => number;
}






export class ConfigService {
  private startTime: number;

  constructor(private deps: ConfigServiceDeps) {
    this.startTime = Date.now();
  }

  
  
  

  
  listServers(): ServerWithId[] {
    const config = this.deps.config.get();
    return Object.entries(config.servers).map(([id, server]) =>
      this.toServerWithId(id, server)
    );
  }

  
  getServer(id: string): ServerWithId {
    const config = this.deps.config.get();
    const server = config.servers[id];
    if (!server) {
      throw ApiError.notFound(`Server '${id}' not found`, "SERVER_NOT_FOUND");
    }
    return this.toServerWithId(id, server);
  }

  
  createServer(input: unknown): ServerWithId {
    
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

    
    if (config.servers[id]) {
      throw ApiError.conflict(`Server '${id}' already exists`, "DUPLICATE_ID");
    }

    
    let serverConfig: ServerConfig;
    if (type === "local") {
      const { command, args, env, description, filters } = rest as Omit<CreateLocalServerInput, "id" | "type">;
      serverConfig = { command, args, env, description, filters };
    } else {
      const { url, headers, description, filters } = rest as Omit<CreateRemoteServerInput, "id" | "type">;
      serverConfig = { url, headers, description, filters };
    }

    
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

  
  updateServer(id: string, input: unknown): ServerWithId {
    const config = this.deps.config.get();
    const existing = config.servers[id];

    if (!existing) {
      throw ApiError.notFound(`Server '${id}' not found`, "SERVER_NOT_FOUND");
    }

    
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

    
    const updated: ServerConfig = {
      ...existing,
      ...parsed.data,
    };

    
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

  
  deleteServer(id: string): DeleteResult {
    const config = this.deps.config.get();

    if (!config.servers[id]) {
      throw ApiError.notFound(`Server '${id}' not found`, "SERVER_NOT_FOUND");
    }

    
    const usedBy = Object.entries(config.endpoints)
      .filter(([_, endpoint]) => endpoint.servers.includes(id))
      .map(([endpointId]) => endpointId);

    
    const updatedEndpoints = { ...config.endpoints };
    for (const endpointId of usedBy) {
      const endpoint = updatedEndpoints[endpointId];
      const remainingServers = endpoint.servers.filter((s) => s !== id);
      if (remainingServers.length === 0) {
        
        delete updatedEndpoints[endpointId];
      } else {
        updatedEndpoints[endpointId] = {
          ...endpoint,
          servers: remainingServers,
        };
      }
    }

    
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

  
  
  

  
  listEndpoints(): EndpointWithId[] {
    const config = this.deps.config.get();
    return Object.entries(config.endpoints).map(([id, endpoint]) =>
      this.toEndpointWithId(id, endpoint)
    );
  }

  
  getEndpoint(id: string): EndpointWithId {
    const config = this.deps.config.get();
    const endpoint = config.endpoints[id];
    if (!endpoint) {
      throw ApiError.notFound(`Endpoint '${id}' not found`, "ENDPOINT_NOT_FOUND");
    }
    return this.toEndpointWithId(id, endpoint);
  }

  
  createEndpoint(input: unknown): EndpointWithId {
    
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

    
    if (config.endpoints[id]) {
      throw ApiError.conflict(`Endpoint '${id}' already exists`, "DUPLICATE_ID");
    }

    
    const missingServers = servers.filter((s) => !config.servers[s]);
    if (missingServers.length > 0) {
      throw ApiError.validation(
        `Server(s) not found: ${missingServers.join(", ")}`,
        "SERVERS_NOT_FOUND",
        { missingServers }
      );
    }

    
    const endpointConfig: EndpointConfig = {
      servers,
      description,
      filters,
    };

    
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

  
  updateEndpoint(id: string, input: unknown): EndpointWithId {
    const config = this.deps.config.get();
    const existing = config.endpoints[id];

    if (!existing) {
      throw ApiError.notFound(`Endpoint '${id}' not found`, "ENDPOINT_NOT_FOUND");
    }

    
    const parsed = UpdateEndpointInputSchema.safeParse(input);
    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.errors[0].message,
        "VALIDATION_ERROR",
        parsed.error.errors
      );
    }

    
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

    
    const updated: EndpointConfig = {
      ...existing,
      ...parsed.data,
    };

    
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

  
  deleteEndpoint(id: string): DeleteResult {
    const config = this.deps.config.get();

    if (!config.endpoints[id]) {
      throw ApiError.notFound(`Endpoint '${id}' not found`, "ENDPOINT_NOT_FOUND");
    }

    
    const sessionCount = this.deps.getSessionCount?.(id) ?? 0;

    
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

  
  
  

  
  getSettings(): Settings {
    const config = this.deps.config.get();
    return {
      filters: config.filters ?? [],
    };
  }

  
  updateSettings(input: unknown): Settings {
    
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

  
  
  

  
  reloadConfig(): boolean {
    const success = this.deps.config.reload();
    if (success) {
      this.deps.logger.info("Configuration reloaded from file");
    }
    return success;
  }

  
  
  

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






export function createConfigService(deps: ConfigServiceDeps): ConfigService {
  return new ConfigService(deps);
}





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
