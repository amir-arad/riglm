import { DatabaseProvider, CollectionLike } from "../common/database-provider";

/**
 * In-memory database singleton
 * Provides a central store for all entity collections
 */
export class InMemoryDatabase implements DatabaseProvider {
  private static instance: InMemoryDatabase;
  private entities: Map<string, Map<string, any>> = new Map();
  private idCounters: Map<string, number> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   * @returns InMemoryDatabase instance
   */
  static getInstance(): InMemoryDatabase {
    if (!InMemoryDatabase.instance) {
      InMemoryDatabase.instance = new InMemoryDatabase();
    }
    return InMemoryDatabase.instance;
  }

  /**
   * Get a collection for an entity
   * @param entityName Entity name
   * @returns Map representing the collection
   */
  getCollection<T>(entityName: string): CollectionLike<T> {
    if (!this.entities.has(entityName)) {
      this.entities.set(entityName, new Map<string, any>());
      this.idCounters.set(entityName, 1);
    }
    return this.entities.get(entityName) as CollectionLike<T>;
  }

  /**
   * Generate a unique ID for an entity
   * @param entityName Entity name
   * @returns Unique ID
   */
  generateId(entityName: string): string {
    const counter = this.idCounters.get(entityName) || 1;
    this.idCounters.set(entityName, counter + 1);
    return `${entityName}_${counter}`;
  }

  /**
   * Clear all data (useful for testing)
   */
  clearAll(): void {
    this.entities.clear();
    this.idCounters.clear();
  }

  /**
   * Dump all data (useful for debugging)
   * @returns Object containing all collections
   */
  dump(): Record<string, any[]> {
    const result: Record<string, any[]> = {};

    for (const [entityName, collection] of this.entities.entries()) {
      result[entityName] = Array.from(collection.values());
    }

    return result;
  }
}
