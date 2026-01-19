

import { existsSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";





export interface ConfigLocation {
  
  configPath: string;
  
  extensionsPath: string;
  
  directory: string;
  
  isLocal: boolean;
}





const CONFIG_FILENAME = "config.json5";
const EXTENSIONS_FILENAME = "extensions.json";
const LOCAL_DIR_NAME = ".riglm";
const APP_NAME = "riglm";






function getXdgConfigHome(): string {
  if (process.env.XDG_CONFIG_HOME) {
    return process.env.XDG_CONFIG_HOME;
  }
  return join(homedir(), ".config");
}


function getPlatformConfigDirs(): string[] {
  const home = homedir();
  const os = platform();

  switch (os) {
    case "darwin":
      
      return [
        join(getXdgConfigHome(), APP_NAME),
        join(home, "Library", "Application Support", APP_NAME),
      ];
    case "win32":
      
      return [
        process.env.APPDATA ? join(process.env.APPDATA, APP_NAME) : join(home, "AppData", "Roaming", APP_NAME),
      ];
    default:
      
      return [join(getXdgConfigHome(), APP_NAME)];
  }
}






function getSearchLocations(): Array<{ dir: string; isLocal: boolean }> {
  const locations: Array<{ dir: string; isLocal: boolean }> = [];

  
  locations.push({
    dir: join(process.cwd(), LOCAL_DIR_NAME),
    isLocal: true,
  });

  
  for (const dir of getPlatformConfigDirs()) {
    locations.push({ dir, isLocal: false });
  }

  return locations;
}


export function findConfig(): ConfigLocation | null {
  for (const { dir, isLocal } of getSearchLocations()) {
    const configPath = join(dir, CONFIG_FILENAME);
    if (existsSync(configPath)) {
      return {
        configPath,
        extensionsPath: join(dir, EXTENSIONS_FILENAME),
        directory: dir,
        isLocal,
      };
    }
  }
  return null;
}


export function getDefaultConfigLocation(local: boolean, customPath?: string): ConfigLocation {
  let directory: string;
  let isLocal: boolean;

  if (customPath) {
    directory = customPath;
    isLocal = false;
  } else if (local) {
    directory = join(process.cwd(), LOCAL_DIR_NAME);
    isLocal = true;
  } else {
    
    const platformDirs = getPlatformConfigDirs();
    directory = platformDirs[0];
    isLocal = false;
  }

  return {
    configPath: join(directory, CONFIG_FILENAME),
    extensionsPath: join(directory, EXTENSIONS_FILENAME),
    directory,
    isLocal,
  };
}


export function getConfigLocation(configPath: string): ConfigLocation {
  const directory = join(configPath, "..");
  const isLocal = directory.endsWith(LOCAL_DIR_NAME);

  return {
    configPath,
    extensionsPath: join(directory, EXTENSIONS_FILENAME),
    directory,
    isLocal,
  };
}
