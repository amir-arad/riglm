/**
 * Mock Config Storage for testing
 */

import { ConfiguratorPort } from "../../src/ports/config-storage.port";
import { Config } from "../../src/domain/config-resolver";

/**
 * Create a mock config storage with a provided config
 */
export function createMockConfigStorage(
  initialConfig?: Config
): ConfiguratorPort & { setConfig: (config: Config) => void } {
  let config: Config = initialConfig || { servers: {}, endpoints: {} };

  return {
    load: () => config,
    get: () => config,
    reload: () => true,
    save: (newConfig: Config) => {
      config = newConfig;
    },
    getFilters: (serverName: string, _endpointId?: string) => {
      const serverConfig = config.servers[serverName];
      const serverFilters = serverConfig?.filters || [];
      const globalFilters = config.filters || [];
      return [...globalFilters, ...serverFilters];
    },
    setConfig: (newConfig: Config) => {
      config = newConfig;
    },
  };
}
