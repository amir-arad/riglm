/**
 * File Extension Adapter - Implements ExtensionStoragePort using file system
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import type { ExtensionStoragePort } from "../../ports/extension-storage.port";
import type { LoggerPort } from "../../ports/logger.port";
import { type Extension, validateExtension } from "../../domain/extension";

/**
 * File-based implementation of ExtensionStoragePort.
 * Loads and saves extensions to a JSON file.
 */
export class FileExtensionAdapter implements ExtensionStoragePort {
  constructor(
    private filePath: string,
    private logger: LoggerPort
  ) {}

  /**
   * Load all extensions from the JSON file
   */
  load(): Extension[] {
    try {
      const data = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(data);

      if (!Array.isArray(parsed)) {
        throw new Error("Extensions file must contain an array");
      }

      // Validate each extension
      parsed.forEach((ext, index) => {
        try {
          validateExtension(ext);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Invalid extension at index ${index}: ${message}`);
        }
      });

      this.logger.debug(`Loaded ${parsed.length} extensions from ${this.filePath}`);
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load extensions: ${message}`);
      throw error;
    }
  }

  /**
   * Save all extensions to the JSON file
   */
  save(extensions: Extension[]): void {
    try {
      const data = JSON.stringify(extensions, null, 2);
      writeFileSync(this.filePath, data, "utf8");
      this.logger.debug(`Saved ${extensions.length} extensions to ${this.filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to save extensions: ${message}`);
      throw error;
    }
  }

  /**
   * Check if the storage file exists
   */
  exists(): boolean {
    return existsSync(this.filePath);
  }

  /**
   * Initialize storage with empty array if it doesn't exist
   */
  initialize(): void {
    if (!this.exists()) {
      this.save([]);
      this.logger.info(`Initialized extensions file at ${this.filePath}`);
    }
  }
}

/**
 * Create a FileExtensionAdapter instance
 */
export function createFileExtensionAdapter(
  filePath: string,
  logger: LoggerPort
): ExtensionStoragePort {
  return new FileExtensionAdapter(filePath, logger);
}
