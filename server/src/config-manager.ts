import { readFileSync } from "fs";
import { ServerConfigurator } from "./server";
import {
  Config,
  isLocalServer,
  isRemoteServer,
  validateIdentifier,
  Filters,
} from "./etc/config-schema";
import { logger } from "./etc/logger";
import JSON5 from "json5";

export class ConfigManager implements ServerConfigurator {
  private currentConfig: Config | null = null;

  constructor(private configPath: string) {}

  /**
   * Resolve filters for a specific server by combining global and server-specific filters
   * If server has its own filters, they override global filters completely
   */
  /**
   * Get the raw filters for a specific server or global filters
   * @param serverId Optional server ID to get server-specific filters
   * @returns Array of filter patterns
   * @throws Error if configuration is not loaded or server is not found
   */
  getFilters(serverId?: string): Filters {
    if (!this.currentConfig) {
      throw new Error("Configuration not loaded. Call load() first.");
    }

    if (!serverId) {
      return this.currentConfig.filters || [];
    }

    const server = this.currentConfig.servers[serverId];
    if (!server) {
      throw new Error(`Server "${serverId}" not found in configuration`);
    }

    // Return server-specific filters if they exist, otherwise return global filters
    return server.filters || this.currentConfig.filters || [];
  }

  load(): Config {
    try {
      logger.info(`Loading configuration from ${this.configPath}`);
      const configData = readFileSync(this.configPath, "utf8");
      const config = JSON5.parse(configData);
      validateConfig(config);
      this.currentConfig = config;
      logger.info("Configuration loaded successfully");
      return config;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to load configuration: ${message}`);
      throw error;
    }
  }

  get(): Config {
    if (!this.currentConfig) {
      throw new Error("Configuration not loaded. Call load() first.");
    }
    return this.currentConfig;
  }

  reload(): boolean {
    try {
      this.load();
      return true;
    } catch (error) {
      logger.error(
        "Failed to reload configuration. Using previous configuration."
      );
      return false;
    }
  }
}

export function validateConfig(arg: unknown): asserts arg is Config {
  if (typeof arg !== "object" || arg === null) {
    throw new Error("Configuration must be a non-null object");
  }
  if (Array.isArray(arg)) {
    throw new Error("Configuration must not be an array");
  }
  const config = arg as Config;
  if (!config.servers || typeof config.servers !== "object") {
    throw new Error('Configuration must contain a "servers" object');
  }
  if (!config.contexts || typeof config.contexts !== "object") {
    throw new Error('Configuration must contain a "contexts" object');
  }
  if (!config.endpoints || typeof config.endpoints !== "object") {
    throw new Error('Configuration must contain an "endpoints" object');
  }

  // Helper function to validate filters object
  const validateFilters = (filters: unknown, context: string) => {
    if (
      !Array.isArray(filters) ||
      !filters.every((p) => typeof p === "string")
    ) {
      throw new Error(`The filters in ${context} must be an array of strings`);
    }
  };

  // Validate global filters if present
  if (config.filters) {
    validateFilters(config.filters, "global configuration");
  }
  for (const [serverName, server] of Object.entries(config.servers)) {
    validateIdentifier(serverName);
    if (isLocalServer(server)) {
      if (!server.command) {
        throw new Error(
          `Server "${serverName}" must contain a "command" string`
        );
      }
      if (!Array.isArray(server.args)) {
        throw new Error(`Server "${serverName}" must contain an "args" array`);
      }
      // Validate server-specific filters if present
      if (server.filters) {
        validateFilters(server.filters, `server "${serverName}"`);
      }
    } else if (isRemoteServer(server)) {
      if (!server.url) {
        throw new Error(`Server "${serverName}" must contain a "url" string`);
      }
      // Validate server-specific filters if present
      if (server.filters) {
        validateFilters(server.filters, `server "${serverName}"`);
      }
    } else {
      throw new Error(
        `Server "${serverName}" must be either a local or remote server configuration`
      );
    }
  }
  for (const [contextName, context] of Object.entries(config.contexts)) {
    validateIdentifier(contextName);
    if (!Array.isArray(context.servers) || context.servers.length === 0) {
      throw new Error(
        `Context "${contextName}" must contain a non-empty "servers" array`
      );
    }
    for (const serverName of context.servers) {
      if (!config.servers[serverName]) {
        throw new Error(
          `Context "${contextName}" references non-existent server "${serverName}"`
        );
      }
    }
  }
  for (const [endpointName, endpoint] of Object.entries(config.endpoints)) {
    validateIdentifier(endpointName);
    if (!Array.isArray(endpoint.contexts) || endpoint.contexts.length === 0) {
      throw new Error(
        `Endpoint "${endpointName}" must contain a non-empty "contexts" array`
      );
    }
    for (const contextName of endpoint.contexts) {
      if (!config.contexts[contextName]) {
        throw new Error(
          `Endpoint "${endpointName}" references non-existent context "${contextName}"`
        );
      }
    }
  }
}
