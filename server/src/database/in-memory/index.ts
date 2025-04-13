/**
 * In-memory database implementation
 * Provides a simple in-memory database for development and testing
 */

// Export database components
export { InMemoryDatabase } from "./in-memory-database";
export { InMemoryModel } from "./in-memory-model";
export { Document, IDocument } from "./document";
export { initializeDatabase } from "./init";

// Re-export entity registry
import {
  EntityRegistry,
  IEntity,
  createEntityModel,
  createEntitySchema,
} from "../../models/entity.model";
export { EntityRegistry, IEntity, createEntityModel, createEntitySchema };
