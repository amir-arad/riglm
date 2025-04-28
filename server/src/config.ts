import { readFileSync } from "fs";
import path from "path";
import { env } from "./etc/env";
import { logger } from "./etc/logger";

// Type definitions matching the schema
export type ServerIdentifier = string; // Pattern: ^[a-zA-Z_][a-zA-Z0-9_]*$
export type ContextIdentifier = string; // Pattern: ^[a-zA-Z_][a-zA-Z0-9_]*$
export type EndpointIdentifier = string; // Pattern: ^[a-zA-Z_][a-zA-Z0-9_]*$

export interface LocalServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
}

export interface RemoteServer {
  url: string;
  headers?: Record<string, string>;
  description?: string;
}

export type Server = LocalServer | RemoteServer;

export interface Context {
  description?: string;
  guidelines?: string;
  servers: ServerIdentifier[];
}

export interface Endpoint {
  description?: string;
  contexts: ContextIdentifier[];
  apiKey?: string;
}

export interface Config {
  servers: Record<ServerIdentifier, Server>;
  contexts: Record<ContextIdentifier, Context>;
  endpoints: Record<EndpointIdentifier, Endpoint>;
}

// Helper to determine if a server is local or remote
export function isLocalServer(server: Server): server is LocalServer {
  return "command" in server && "args" in server;
}

export function isRemoteServer(server: Server): server is RemoteServer {
  return "url" in server;
}

// Global configuration state
let currentConfig: Config | null = null;

/**
 * Load the configuration from the JSON file.
 * Validates basic structure of the configuration.
 *
 * @returns The loaded and validated configuration
 * @throws Error if the configuration file cannot be loaded or is invalid
 */
export function loadConfig(): Config {
  try {
    logger.info(`Loading configuration from ${env.mvpConfigPath}`);
    const configData = readFileSync(env.mvpConfigPath, "utf8");
    const config = JSON.parse(configData) as Config;

    // Basic validation
    validateConfig(config);

    // Store as current config
    currentConfig = config;
    logger.info("Configuration loaded successfully");

    return config;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load configuration: ${message}`);
    throw error;
  }
}

/**
 * Validate the loaded configuration.
 *
 * @param config The configuration to validate
 * @throws Error if the configuration is invalid
 */
function validateConfig(config: Config): void {
  // Check required top-level objects
  if (!config.servers || typeof config.servers !== "object") {
    throw new Error('Configuration must contain a "servers" object');
  }

  if (!config.contexts || typeof config.contexts !== "object") {
    throw new Error('Configuration must contain a "contexts" object');
  }

  if (!config.endpoints || typeof config.endpoints !== "object") {
    throw new Error('Configuration must contain an "endpoints" object');
  }

  // Validate servers
  for (const [serverName, server] of Object.entries(config.servers)) {
    validateServerName(serverName);

    if (isLocalServer(server)) {
      if (!server.command) {
        throw new Error(
          `Server "${serverName}" must contain a "command" string`
        );
      }
      if (!Array.isArray(server.args)) {
        throw new Error(`Server "${serverName}" must contain an "args" array`);
      }
    } else if (isRemoteServer(server)) {
      if (!server.url) {
        throw new Error(`Server "${serverName}" must contain a "url" string`);
      }
    } else {
      throw new Error(
        `Server "${serverName}" must be either a local or remote server configuration`
      );
    }
  }

  // Validate contexts
  for (const [contextName, context] of Object.entries(config.contexts)) {
    validateContextName(contextName);

    if (!Array.isArray(context.servers) || context.servers.length === 0) {
      throw new Error(
        `Context "${contextName}" must contain a non-empty "servers" array`
      );
    }

    // Check that all referenced servers exist
    for (const serverName of context.servers) {
      if (!config.servers[serverName]) {
        throw new Error(
          `Context "${contextName}" references non-existent server "${serverName}"`
        );
      }
    }
  }

  // Validate endpoints
  for (const [endpointName, endpoint] of Object.entries(config.endpoints)) {
    validateEndpointName(endpointName);

    if (!Array.isArray(endpoint.contexts) || endpoint.contexts.length === 0) {
      throw new Error(
        `Endpoint "${endpointName}" must contain a non-empty "contexts" array`
      );
    }

    // Check that all referenced contexts exist
    for (const contextName of endpoint.contexts) {
      if (!config.contexts[contextName]) {
        throw new Error(
          `Endpoint "${endpointName}" references non-existent context "${contextName}"`
        );
      }
    }
  }
}

/**
 * Validate a server name against the pattern ^[a-zA-Z_][a-zA-Z0-9_]*$
 */
function validateServerName(name: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid server name "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
}

/**
 * Validate a context name against the pattern ^[a-zA-Z_][a-zA-Z0-9_]*$
 */
function validateContextName(name: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid context name "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
}

/**
 * Validate an endpoint name against the pattern ^[a-zA-Z_][a-zA-Z0-9_]*$
 */
function validateEndpointName(name: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid endpoint name "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
}

/**
 * Get the current configuration.
 * Must be called after loadConfig().
 *
 * @returns The current configuration
 * @throws Error if the configuration has not been loaded
 */
export function getCurrentConfig(): Config {
  if (!currentConfig) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }
  return currentConfig;
}

/**
 * Reload the configuration.
 * Maintains the current configuration if loading fails.
 *
 * @returns true if reload was successful, false otherwise
 */
export function reloadConfig(): boolean {
  try {
    loadConfig();
    return true;
  } catch (error) {
    logger.error(
      "Failed to reload configuration. Using previous configuration."
    );
    return false;
  }
}
