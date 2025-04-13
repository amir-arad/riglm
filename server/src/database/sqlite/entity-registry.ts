import { IDocument } from "../common/document";
import { SQLiteModel } from "./sqlite-model";

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
 * @returns SQLiteModel
 */
export function createEntityModel(
  entityName: string,
  schemaDefinition: Record<string, any> = {}
): SQLiteModel<IEntity> {
  // Create schema
  const schema = createEntitySchema(schemaDefinition);

  // Create and return model
  return new SQLiteModel<IEntity>(entityName, schema);
}

/**
 * Entity registry to keep track of created entity models
 */
export class EntityRegistry {
  private static registry: Map<string, SQLiteModel<IEntity>> = new Map();

  /**
   * Get or create an entity model
   * @param entityName Entity name
   * @param schemaDefinition Schema definition
   * @returns SQLiteModel
   */
  static getOrCreate(
    entityName: string,
    schemaDefinition: Record<string, any> = {}
  ): SQLiteModel<IEntity> {
    // Check if model exists in registry
    if (this.registry.has(entityName)) {
      return this.registry.get(entityName) as SQLiteModel<IEntity>;
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
  static getAll(): Map<string, SQLiteModel<IEntity>> {
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
