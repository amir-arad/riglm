/**
 * Config Locator
 *
 * Handles auto-detection of configuration files in standard locations.
 * @see docs/cli-design.md for specification
 */

import { existsSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";

// ============================================================================
// Types
// ============================================================================

export interface ConfigLocation {
  /** Path to config.json5 */
  configPath: string;
  /** Path to extensions.json (derived from same directory) */
  extensionsPath: string;
  /** Directory containing both files */
  directory: string;
  /** Whether this is a local (project-level) override */
  isLocal: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILENAME = "config.json5";
const EXTENSIONS_FILENAME = "extensions.json";
const LOCAL_DIR_NAME = ".abc";
const APP_NAME = "abc";

// ============================================================================
// Platform-specific Paths
// ============================================================================

/**
 * Get the XDG config directory (or platform equivalent)
 */
function getXdgConfigHome(): string {
  if (process.env.XDG_CONFIG_HOME) {
    return process.env.XDG_CONFIG_HOME;
  }
  return join(homedir(), ".config");
}

/**
 * Get platform-specific config directories in order of preference
 */
function getPlatformConfigDirs(): string[] {
  const home = homedir();
  const os = platform();

  switch (os) {
    case "darwin":
      // macOS: prefer XDG, then Application Support
      return [
        join(getXdgConfigHome(), APP_NAME),
        join(home, "Library", "Application Support", APP_NAME),
      ];
    case "win32":
      // Windows: prefer APPDATA
      return [
        process.env.APPDATA ? join(process.env.APPDATA, APP_NAME) : join(home, "AppData", "Roaming", APP_NAME),
      ];
    default:
      // Linux and others: XDG config
      return [join(getXdgConfigHome(), APP_NAME)];
  }
}

// ============================================================================
// Location Detection
// ============================================================================

/**
 * Get all possible config locations in priority order
 */
function getSearchLocations(): Array<{ dir: string; isLocal: boolean }> {
  const locations: Array<{ dir: string; isLocal: boolean }> = [];

  // 1. Local override (project-level): ./.abc/
  locations.push({
    dir: join(process.cwd(), LOCAL_DIR_NAME),
    isLocal: true,
  });

  // 2. Platform-specific global locations
  for (const dir of getPlatformConfigDirs()) {
    locations.push({ dir, isLocal: false });
  }

  return locations;
}

/**
 * Find the first existing config file in standard locations
 *
 * Search order:
 * 1. ./.abc/config.json5 (local override)
 * 2. ~/.config/abc/config.json5 (XDG default on Linux/macOS)
 * 3. ~/Library/Application Support/abc/config.json5 (macOS alternative)
 * 4. %APPDATA%\abc\config.json5 (Windows)
 */
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

/**
 * Get the default config location for initialization
 *
 * @param local If true, returns local project directory
 * @param customPath Optional custom path
 */
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
    // Default to first platform config dir
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

/**
 * Get config location from an explicit path
 */
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
