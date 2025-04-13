/**
 * SQLite database implementation
 * Provides a SQLite-based alternative to the in-memory database
 */

// Export database components
export { SQLiteDatabase } from "./sqlite-database";
export { SQLiteModel } from "./sqlite-model";
export { Document, IDocument } from "./document";
export {
  EntityRegistry,
  IEntity,
  createEntityModel,
  createEntitySchema,
} from "./entity-registry";
export { initializeDatabase } from "./init";
