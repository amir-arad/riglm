import { z } from "zod";

export const IdentifierSchema = z
  .string()
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "Must start with a letter or underscore and contain only letters, numbers, and underscores",
  );

export const FiltersSchema = z.array(z.string());

export const LocalServerConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

export const RemoteServerConfigSchema = z.object({
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

export const ServerConfigSchema = z.union([
  LocalServerConfigSchema,
  RemoteServerConfigSchema,
]);

export const EndpointConfigSchema = z.object({
  description: z.string().optional(),
  servers: z.array(z.string()).min(1, "Endpoint must have at least one server"),
  disabledServers: z.array(z.string()).optional(),
  filters: FiltersSchema.optional(),
  apiKey: z.string().optional(),
});

export const ConfigSchema = z.object({
  servers: z.record(z.string(), ServerConfigSchema),
  endpoints: z.record(z.string(), EndpointConfigSchema),
  filters: FiltersSchema.optional(),
});

export type Identifier = z.infer<typeof IdentifierSchema>;

export type Filters = z.infer<typeof FiltersSchema>;

export type LocalServerConfig = z.infer<typeof LocalServerConfigSchema>;

export type RemoteServerConfig = z.infer<typeof RemoteServerConfigSchema>;

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export type EndpointConfig = z.infer<typeof EndpointConfigSchema>;

export type Config = z.infer<typeof ConfigSchema>;

export function isLocalServer(
  server: ServerConfig,
): server is LocalServerConfig {
  return "command" in server && "args" in server;
}

export function isRemoteServer(
  server: ServerConfig,
): server is RemoteServerConfig {
  return "url" in server;
}

export class ConfigResolver {
  constructor(private config: Config) {}

  getFilters(serverId?: Identifier, endpointId?: Identifier): Filters {
    if (serverId) {
      const server = this.config.servers[serverId];
      if (server?.filters) {
        return server.filters;
      }
    }

    if (endpointId) {
      const endpoint = this.config.endpoints[endpointId];
      if (endpoint?.filters) {
        return endpoint.filters;
      }
    }

    return this.config.filters || [];
  }

  getServer(serverId: Identifier): ServerConfig | undefined {
    return this.config.servers[serverId];
  }

  getEndpoint(endpointId: Identifier): EndpointConfig | undefined {
    return this.config.endpoints[endpointId];
  }

  getEndpointServers(endpointId: Identifier): Identifier[] {
    const endpoint = this.config.endpoints[endpointId];
    return endpoint?.servers || [];
  }

  getDisabledServers(endpointId: Identifier): Identifier[] {
    const endpoint = this.config.endpoints[endpointId];
    return endpoint?.disabledServers || [];
  }

  getEndpointIds(): Identifier[] {
    return Object.keys(this.config.endpoints);
  }

  getServerIds(): Identifier[] {
    return Object.keys(this.config.servers);
  }

  getConfig(): Config {
    return this.config;
  }
}

const ValidatedConfigSchema = ConfigSchema.superRefine((config, ctx) => {
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

  for (const [endpointName, endpoint] of Object.entries(config.endpoints)) {
    const identResult = IdentifierSchema.safeParse(endpointName);
    if (!identResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid endpoint name "${endpointName}": ${identResult.error.issues[0].message}`,
        path: ["endpoints", endpointName],
      });
    }

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

export function validateConfig(config: unknown): asserts config is Config {
  ValidatedConfigSchema.parse(config);
}

export { ValidatedConfigSchema };
