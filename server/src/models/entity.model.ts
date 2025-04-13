import { env } from "../config/env";
import { IDocument } from "../database/common/document";

// Import database implementations
import { InMemoryModel } from "../database/in-memory/in-memory-model";
import { SQLiteModel } from "../database/sqlite/sqlite-model";

/**
 * Base entity document interface
 */
export interface IEntity extends IDocument {
  [key: string]: any;
}

/**
 * Create a dynamic entity schema
 * @param schemaDefinition Schema definition
 * @returns Schema definition
 */
export function createEntitySchema(
  schemaDefinition: Record<string, any> = {}
): Record<string, any> {
  return {
    ...schemaDefinition,
    // Add any common fields here
  };
}

/**
 * Create a dynamic entity model
 * @param entityName Entity name
 * @param schemaDefinition Schema definition
 * @returns Model for the entity
 */
export function createEntityModel(
  entityName: string,
  schemaDefinition: Record<string, any> = {}
): InMemoryModel<IEntity> | SQLiteModel<IEntity> {
  // Create schema
  const schema = createEntitySchema(schemaDefinition);

  // Create and return model based on database type
  if (env.database.type === "sqlite") {
    return new SQLiteModel<IEntity>(entityName, schema);
  } else {
    return new InMemoryModel<IEntity>(entityName, schema);
  }
}

/**
 * Entity registry to keep track of created entity models
 */
export class EntityRegistry {
  private static registry: Map<
    string,
    InMemoryModel<IEntity> | SQLiteModel<IEntity>
  > = new Map();

  /**
   * Get or create an entity model
   * @param entityName Entity name
   * @param schemaDefinition Schema definition
   * @returns Model for the entity
   */
  static getOrCreate(
    entityName: string,
    schemaDefinition: Record<string, any> = {}
  ): InMemoryModel<IEntity> | SQLiteModel<IEntity> {
    // Check if model exists in registry
    if (this.registry.has(entityName)) {
      return this.registry.get(entityName) as
        | InMemoryModel<IEntity>
        | SQLiteModel<IEntity>;
    }

    // Create model
    const model = createEntityModel(entityName, schemaDefinition);

    // Add to registry
    this.registry.set(entityName, model);

    return model;
  }

  /**
   * Get all registered entity models
   * @returns Map of entity models
   */
  static getAll(): Map<string, InMemoryModel<IEntity> | SQLiteModel<IEntity>> {
    return this.registry;
  }

  /**
   * Check if entity model exists
   * @param entityName Entity name
   * @returns Whether entity model exists
   */
  static exists(entityName: string): boolean {
    return this.registry.has(entityName);
  }
}
