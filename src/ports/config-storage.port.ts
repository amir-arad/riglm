

import { Config } from "../domain/config-resolver";


export interface ConfigStoragePort {
  
  load(): Config;

  
  get(): Config;

  
  reload(): boolean;

  
  save(config: Config): void;
}


export interface ConfiguratorPort extends ConfigStoragePort {
  
  getFilters(serverId?: string, endpointId?: string): string[];
}
