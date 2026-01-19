import {
  Config,
  ConfigResolver,
  Filters,
  validateConfig,
} from "../../domain/config-resolver";
import { readFileSync, writeFileSync } from "fs";

import { ConfiguratorPort } from "../../ports/config-storage.port";
import JSON5 from "json5";
import { LoggerPort } from "../../ports/logger.port";

export function createFileConfigAdapter(
  configPath: string,
  logger: LoggerPort,
): ConfiguratorPort {
  let config: Config | null = null;
  let resolver: ConfigResolver | null = null;

  return {
    load(): Config {
      try {
        logger.info(`Loading configuration from ${configPath}`);
        const configData = readFileSync(configPath, "utf8");
        const parsed = JSON5.parse(configData);
        validateConfig(parsed);
        config = parsed;
        resolver = new ConfigResolver(parsed);
        logger.info("Configuration loaded successfully");
        return parsed;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to load configuration: ${message}`);
        throw error;
      }
    },

    get(): Config {
      if (!config) {
        throw new Error("Configuration not loaded. Call load() first.");
      }
      return config;
    },

    reload(): boolean {
      try {
        this.load();
        return true;
      } catch {
        logger.error(
          "Failed to reload configuration. Using previous configuration.",
        );
        return false;
      }
    },

    save(newConfig: Config): void {
      try {
        validateConfig(newConfig);

        const data = JSON.stringify(newConfig, null, 2);
        writeFileSync(configPath, data, "utf8");

        config = newConfig;
        resolver = new ConfigResolver(newConfig);

        logger.info(`Configuration saved to ${configPath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to save configuration: ${message}`);
        throw error;
      }
    },

    getFilters(serverId?: string, endpointId?: string): Filters {
      if (!resolver) {
        throw new Error("Configuration not loaded. Call load() first.");
      }
      return resolver.getFilters(serverId, endpointId);
    },
  };
}
