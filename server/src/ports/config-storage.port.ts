/**
 * Config Storage Port - Abstracts configuration persistence
 * Enables testing without file system access.
 */

import { Config } from "../domain/types";

/**
 * Interface for loading and accessing application configuration.
 * Implementations may read from files, environment, databases, etc.
 */
export interface ConfigStoragePort {
  /**
   * Load configuration from storage
   * @returns The loaded configuration
   * @throws Error if configuration is invalid or cannot be loaded
   */
  load(): Config;

  /**
   * Get currently loaded configuration
   * @returns The current configuration
   * @throws Error if configuration not loaded
   */
  get(): Config;

  /**
   * Reload configuration from storage
   * @returns true if reload successful, false otherwise
   */
  reload(): boolean;
}

/**
 * Extended interface that also provides filter resolution
 */
export interface ConfiguratorPort extends ConfigStoragePort {
  /**
   * Get filters for a specific server/endpoint
   * Priority: server filters > endpoint filters > global filters
   * @param serverId Optional server identifier
   * @param endpointId Optional endpoint identifier
   * @returns Array of filter patterns
   */
  getFilters(serverId?: string, endpointId?: string): string[];
}
