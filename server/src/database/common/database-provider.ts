/**
 * Database provider interface
 * Defines common methods for all database implementations
 */
export interface DatabaseProvider {
  /**
   * Get a collection for an entity
   * @param entityName Entity name
   * @returns Collection-like object for the entity
   */
  getCollection<T>(entityName: string): CollectionLike<T>;

  /**
   * Generate a unique ID for an entity
   * @param entityName Entity name
   * @returns Unique ID
   */
  generateId(entityName: string): string;

  /**
   * Clear all data (useful for testing)
   */
  clearAll(): void;

  /**
   * Dump all data (useful for debugging)
   * @returns Object containing all collections
   */
  dump(): Record<string, any[]>;
}

/**
 * Collection-like interface
 * Provides a common interface for different collection implementations
 */
export interface CollectionLike<T> {
  /**
   * Get a document by ID
   * @param id Document ID
   * @returns Document or undefined if not found
   */
  get(id: string): T | undefined;

  /**
   * Set a document
   * @param id Document ID
   * @param value Document
   */
  set(id: string, value: T): void;

  /**
   * Delete a document
   * @param id Document ID
   * @returns Whether the document was deleted
   */
  delete(id: string): boolean;

  /**
   * Get all documents
   * @returns Iterator of document entries
   */
  entries(): IterableIterator<[string, T]>;

  /**
   * Get all documents
   * @returns Iterator of documents
   */
  values(): IterableIterator<T>;
}
