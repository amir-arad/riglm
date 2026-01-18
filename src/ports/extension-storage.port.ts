/**
 * Extension Storage Port - Abstracts extension persistence
 * Enables testing without file system access.
 */

import type { Extension } from "../domain/extension";

/**
 * Interface for loading and persisting extensions.
 * Implementations may read from files, databases, etc.
 */
export interface ExtensionStoragePort {
  /**
   * Load all extensions from storage
   * @returns Array of extensions
   * @throws Error if storage is corrupted or cannot be read
   */
  load(): Extension[];

  /**
   * Persist all extensions to storage
   * @param extensions Array of extensions to save
   * @throws Error if storage cannot be written
   */
  save(extensions: Extension[]): void;

  /**
   * Check if storage exists
   * @returns true if storage file/location exists
   */
  exists(): boolean;

  /**
   * Initialize storage with empty array if it doesn't exist
   */
  initialize(): void;
}
