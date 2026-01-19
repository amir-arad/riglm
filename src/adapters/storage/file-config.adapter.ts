

import { readFileSync, writeFileSync } from "fs";
import JSON5 from "json5";
import { ConfiguratorPort } from "../../ports/config-storage.port";
import { LoggerPort } from "../../ports/logger.port";
import { Config, Filters, validateConfig, ConfigResolver } from "../../domain/config-resolver";


export class FileConfigAdapter implements ConfiguratorPort {
  private config: Config | null = null;
  private resolver: ConfigResolver | null = null;

  constructor(
    private configPath: string,
    private logger: LoggerPort
  ) {}

  
  load(): Config {
    try {
      this.logger.info(`Loading configuration from ${this.configPath}`);
      const configData = readFileSync(this.configPath, "utf8");
      const config = JSON5.parse(configData);
      validateConfig(config);
      this.config = config;
      this.resolver = new ConfigResolver(config);
      this.logger.info("Configuration loaded successfully");
      return config;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load configuration: ${message}`);
      throw error;
    }
  }

  
  get(): Config {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call load() first.");
    }
    return this.config;
  }

  
  reload(): boolean {
    try {
      this.load();
      return true;
    } catch (error) {
      this.logger.error(
        "Failed to reload configuration. Using previous configuration."
      );
      return false;
    }
  }

  
  save(config: Config): void {
    try {
      
      validateConfig(config);

      const data = JSON.stringify(config, null, 2);
      writeFileSync(this.configPath, data, "utf8");

      
      this.config = config;
      this.resolver = new ConfigResolver(config);

      this.logger.info(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to save configuration: ${message}`);
      throw error;
    }
  }

  
  getFilters(serverId?: string, endpointId?: string): Filters {
    if (!this.resolver) {
      throw new Error("Configuration not loaded. Call load() first.");
    }
    return this.resolver.getFilters(serverId, endpointId);
  }
}


export function createFileConfigAdapter(
  configPath: string,
  logger: LoggerPort
): ConfiguratorPort {
  return new FileConfigAdapter(configPath, logger);
}
