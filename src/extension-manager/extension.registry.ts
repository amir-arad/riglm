/**
 * Extension Registry - CRUD operations for extensions
 */

import { randomUUID } from "crypto";
import type { ExtensionStoragePort } from "../ports/extension-storage.port";
import type { LoggerPort } from "../ports/logger.port";
import type {
  Extension,
  CreateExtensionInput,
  UpdateExtensionInput,
} from "../domain/extension";

/**
 * Dependencies required by ExtensionRegistry
 */
export interface ExtensionRegistryDeps {
  storage: ExtensionStoragePort;
  logger: LoggerPort;
}

/**
 * Registry for managing extensions with CRUD operations.
 * Maintains an in-memory cache synchronized with persistent storage.
 */
export class ExtensionRegistry {
  private extensions: Extension[] = [];

  constructor(private deps: ExtensionRegistryDeps) {}

  /**
   * Initialize the registry - load from storage or create empty file
   */
  init(): void {
    this.deps.storage.initialize();
    this.extensions = this.deps.storage.load();
    this.deps.logger.info(`Loaded ${this.extensions.length} extensions`);
  }

  /**
   * List all extensions
   * @returns Copy of all extensions array
   */
  list(): Extension[] {
    return [...this.extensions];
  }

  /**
   * Get extension by ID
   * @param id Extension UUID
   * @returns Extension if found, undefined otherwise
   */
  get(id: string): Extension | undefined {
    return this.extensions.find((e) => e.id === id);
  }

  /**
   * Get all enabled extensions
   * @returns Array of extensions where enabled is true
   */
  getEnabled(): Extension[] {
    return this.extensions.filter((e) => e.enabled);
  }

  /**
   * Get extensions by tag
   * @param tag Tag to filter by
   * @returns Array of extensions containing the tag
   */
  getByTag(tag: string): Extension[] {
    return this.extensions.filter((e) => e.tags?.includes(tag));
  }

  /**
   * Create a new extension
   * @param input Extension data (without id, createdAt, updatedAt)
   * @returns Created extension with generated fields
   */
  create(input: CreateExtensionInput): Extension {
    const now = new Date().toISOString();
    const extension: Extension = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.extensions.push(extension);
    this.persist();

    this.deps.logger.info(`Created extension: ${extension.name} (${extension.id})`);
    return extension;
  }

  /**
   * Update an existing extension
   * @param id Extension UUID
   * @param input Partial update data
   * @returns Updated extension
   * @throws Error if extension not found
   */
  update(id: string, input: UpdateExtensionInput): Extension {
    const index = this.extensions.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Extension not found: ${id}`);
    }

    const existing = this.extensions[index];
    const updated: Extension = {
      ...existing,
      ...input,
      // Preserve immutable fields
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.extensions[index] = updated;
    this.persist();

    this.deps.logger.info(`Updated extension: ${updated.name} (${id})`);
    return updated;
  }

  /**
   * Delete an extension
   * @param id Extension UUID
   * @returns true if deleted, false if not found
   */
  delete(id: string): boolean {
    const index = this.extensions.findIndex((e) => e.id === id);
    if (index === -1) {
      return false;
    }

    const [removed] = this.extensions.splice(index, 1);
    this.persist();

    this.deps.logger.info(`Deleted extension: ${removed.name} (${id})`);
    return true;
  }

  /**
   * Toggle extension enabled state
   * @param id Extension UUID
   * @returns Updated extension
   * @throws Error if extension not found
   */
  toggle(id: string): Extension {
    const extension = this.get(id);
    if (!extension) {
      throw new Error(`Extension not found: ${id}`);
    }
    return this.update(id, { enabled: !extension.enabled });
  }

  /**
   * Persist current state to storage
   */
  private persist(): void {
    this.deps.storage.save(this.extensions);
  }
}

