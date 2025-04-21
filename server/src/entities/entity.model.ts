import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "../etc/env";
import { ApiError } from "../etc/error";

/**
 * Get all entities
 * @param entityName Entity name
 * @param sort Sort criteria
 * @param limit Maximum number of entities to return
 * @param skip Number of entities to skip
 * @param fields Fields to include
 * @returns Entities
 */
export async function getAll(
  entityName: string,
  sort?: string,
  limit?: number,
  skip?: number,
  fields?: string
): Promise<IEntity[]> {
  return filter(entityName, {}, sort, limit, skip, fields);
}

/**
 * Filter entities
 * @param entityName Entity name
 * @param filter Filter criteria
 * @param sort Sort criteria
 * @param limit Maximum number of entities to return
 * @param skip Number of entities to skip
 * @param fields Fields to include
 * @returns Filtered entities
 */
export async function filter(
  entityName: string,
  filter: Record<string, any>,
  sort?: string,
  limit?: number,
  skip?: number,
  fields?: string
): Promise<IEntity[]> {
  // Get entity model
  const model = getModel(entityName);

  // Execute find with filter first
  const results = await model.find(filter);

  // If no additional processing is needed, return results
  if (!sort && !limit && !skip && !fields) {
    return results;
  }

  // Otherwise, apply additional processing
  let processedResults = [...results];

  // Apply sort
  if (sort) {
    // Simple sort implementation
    const sortFields = sort.split(/\s+|,/).filter((f) => f.length > 0);

    processedResults.sort((a, b) => {
      for (const field of sortFields) {
        const desc = field.startsWith("-");
        const fieldName = desc ? field.substring(1) : field;

        if (a[fieldName] < b[fieldName]) {
          return desc ? 1 : -1;
        }
        if (a[fieldName] > b[fieldName]) {
          return desc ? -1 : 1;
        }
      }
      return 0;
    });
  }

  // Apply skip
  if (skip) {
    processedResults = processedResults.slice(skip);
  }

  // Apply limit
  if (limit) {
    processedResults = processedResults.slice(0, limit);
  }

  // Apply field selection
  if (fields) {
    const selectedFields = fields.split(/\s+|,/).filter((f) => f.length > 0);

    processedResults = processedResults.map((doc) => {
      const selected: Partial<IEntity> = { id: doc.id };

      for (const field of selectedFields) {
        if (field in doc) {
          (selected as any)[field] = doc[field];
        }
      }

      return selected as IEntity;
    });
  }

  return processedResults;
}

/**
 * Get entity by ID
 * @param entityName Entity name
 * @param id Entity ID
 * @returns Entity
 */
export async function getById(
  entityName: string,
  id: string
): Promise<IEntity> {
  if (entityName === "user" && id === "me") {
    // Special case for 'me' ID
    return {
      id: id,
      name: "Current User",

      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  // Get entity model
  const model = getModel(entityName);

  // Find entity by ID
  const entity = await model.findById(id);

  // Check if entity exists
  if (!entity) {
    throw ApiError.notFound(`${entityName} not found`);
  }

  return entity;
}

/**
 * Create entity
 * @param entityName Entity name
 * @param data Entity data
 * @returns Created entity
 */
export async function create(
  entityName: string,
  data: Record<string, any>
): Promise<IEntity> {
  // Get entity model
  const model = getModel(entityName);

  // Create entity
  return model.create(data);
}

/**
 * Update entity
 * @param entityName Entity name
 * @param id Entity ID
 * @param data Entity data
 * @returns Updated entity
 */
export async function update(
  entityName: string,
  id: string,
  data: Record<string, any>
): Promise<IEntity> {
  // Get entity model
  const model = getModel(entityName);

  // Find and update entity
  const entity = await model.findByIdAndUpdate(id, data);

  // Check if entity exists
  if (!entity) {
    throw ApiError.notFound(`${entityName} not found`);
  }

  return entity;
}

/**
 * Delete entity
 * @param entityName Entity name
 * @param id Entity ID
 */
export async function deleteEntities(
  entityName: string,
  id: string
): Promise<void> {
  // Get entity model
  const model = getModel(entityName);

  // Find and delete entity
  const result = await model.findByIdAndDelete(id);

  // Check if entity exists
  if (!result) {
    throw ApiError.notFound(`${entityName} not found`);
  }
}

/**
 * Delete multiple entities
 * @param entityName Entity name
 * @param filter Filter criteria
 */
export async function deleteMany(
  entityName: string,
  filter: Record<string, any>
): Promise<void> {
  // Get entity model
  const model = getModel(entityName);

  // Delete entities
  await model.deleteMany(filter);
}

/**
 * Create multiple entities
 * @param entityName Entity name
 * @param data Entity data
 * @returns Created entities
 */
export async function bulkCreate(
  entityName: string,
  data: Record<string, any>[]
): Promise<IEntity[]> {
  // Get entity model
  const model = getModel(entityName);

  // Create entities
  return model.insertMany(data);
}

// Type definition for entity documents
export interface IEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

// Database singleton
const dbPath = env.sqlitePath;
// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

export function init() {
  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Initialize id_counters table for ID generation
  db.exec(`
  CREATE TABLE IF NOT EXISTS id_counters (
    entity_name TEXT PRIMARY KEY,
    counter INTEGER NOT NULL DEFAULT 1
    )
  `);
}

export function close() {
  db.close();
}

/**
 * Get a model for an entity
 * @param entityName Name of the entity
 * @returns Object with CRUD methods for the entity
 */
function getModel(entityName: string) {
  const tableName = entityName.toLowerCase();
  // Create table if it doesn't exist
  createTable(tableName);

  // Create and return model functions
  return createModelFunctions(tableName);
}

/**
 * Create a table for an entity
 * @param entityName Name of the entity
 */
function createTable(entityName: string) {
  // Check if table exists
  const tableExists = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `
    )
    .get(entityName);

  if (!tableExists) {
    // Create table with basic document fields
    db.exec(`
      CREATE TABLE ${entityName} (
        id TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        data TEXT NOT NULL
      )
    `);
  }
}

/**
 * Generate a unique ID for an entity
 * @param entityName Name of the entity
 * @returns Unique ID
 */
function generateId(entityName: string): string {
  // Check if counter exists
  const stmt = db.prepare(
    "SELECT counter FROM id_counters WHERE entity_name = ?"
  );
  const row = stmt.get(entityName) as { counter: number } | undefined;

  if (!row) {
    // Initialize counter
    db.prepare(
      "INSERT INTO id_counters (entity_name, counter) VALUES (?, 1)"
    ).run(entityName);
    return `${entityName}_1`;
  }

  // Increment counter
  const counter = row.counter;
  const updateStmt = db.prepare(
    "UPDATE id_counters SET counter = ? WHERE entity_name = ?"
  );
  updateStmt.run(counter + 1, entityName);

  return `${entityName}_${counter}`;
}

/**
 * Create model functions for an entity
 * @param entityName Name of the entity
 * @returns Object with CRUD methods
 */
function createModelFunctions(entityName: string) {
  return {
    /**
     * Find documents matching a filter
     * @param filter Filter criteria
     * @returns Matching documents
     */
    async find(filter: Record<string, any> = {}): Promise<IEntity[]> {
      const stmt = db.prepare(`SELECT * FROM ${entityName}`);
      const rows = stmt.all() as any[];

      return rows
        .map((row) => deserializeDocument(row))
        .filter((doc) => matchesFilter(doc, filter));
    },

    /**
     * Find a document by ID
     * @param id Document ID
     * @returns Document or null if not found
     */
    async findById(id: string): Promise<IEntity | null> {
      const stmt = db.prepare(`SELECT * FROM ${entityName} WHERE id = ?`);
      const row = stmt.get(id) as any;

      if (!row) return null;

      return deserializeDocument(row);
    },

    /**
     * Find one document matching a filter
     * @param filter Filter criteria
     * @returns Document or null if not found
     */
    async findOne(filter: Record<string, any> = {}): Promise<IEntity | null> {
      const documents = await this.find(filter);
      return documents.length > 0 ? documents[0] : null;
    },

    /**
     * Create a new document
     * @param data Document data
     * @returns Created document
     */
    async create(data: Partial<IEntity>): Promise<IEntity> {
      const now = new Date();

      const document: IEntity = {
        ...data,
        id: data.id || generateId(entityName),
        createdAt: data.createdAt || now,
        updatedAt: now,
      } as IEntity;

      const { id, createdAt, updatedAt, ...rest } = document;

      const stmt = db.prepare(`
        INSERT INTO ${entityName} (id, createdAt, updatedAt, data)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        id,
        createdAt.toISOString(),
        updatedAt.toISOString(),
        JSON.stringify(rest)
      );

      return document;
    },

    /**
     * Find a document by ID and update it
     * @param id Document ID
     * @param update Update data
     * @returns Updated document or null if not found
     */
    async findByIdAndUpdate(
      idArg: string,
      update: Partial<IEntity>
    ): Promise<IEntity | null> {
      const stmt = db.prepare(`SELECT * FROM ${entityName} WHERE id = ?`);
      const row = stmt.get(idArg) as any;

      if (!row) return null;

      const document = deserializeDocument(row);
      const updatedDocument: IEntity = {
        ...document,
        ...update,
        id: idArg,
        updatedAt: new Date(),
      };

      const { id, createdAt, updatedAt, ...rest } = updatedDocument;

      const updateStmt = db.prepare(`
        UPDATE ${entityName}
        SET updatedAt = ?, data = ?
        WHERE id = ?
      `);

      updateStmt.run(updatedAt.toISOString(), JSON.stringify(rest), id);

      return updatedDocument;
    },

    /**
     * Find a document by ID and delete it
     * @param id Document ID
     * @returns Deleted document or null if not found
     */
    async findByIdAndDelete(id: string): Promise<IEntity | null> {
      const document = await this.findById(id);

      if (!document) return null;

      const stmt = db.prepare(`DELETE FROM ${entityName} WHERE id = ?`);
      stmt.run(id);

      return document;
    },

    /**
     * Delete multiple documents matching a filter
     * @param filter Filter criteria
     * @returns Number of deleted documents
     */
    async deleteMany(filter: Record<string, any> = {}): Promise<number> {
      // Find documents matching the filter
      const documents = await this.find(filter);

      // Delete each document
      let count = 0;
      for (const doc of documents) {
        const stmt = db.prepare(`DELETE FROM ${entityName} WHERE id = ?`);
        const result = stmt.run(doc.id);
        if (result.changes > 0) {
          count++;
        }
      }

      return count;
    },

    /**
     * Insert multiple documents
     * @param data Document data
     * @returns Created documents
     */
    async insertMany(data: Partial<IEntity>[]): Promise<IEntity[]> {
      const results: IEntity[] = [];

      // Create each document
      for (const item of data) {
        results.push(await this.create(item));
      }

      return results;
    },
  };
}

/**
 * Check if a document matches a filter
 * @param document Document to check
 * @param filter Filter criteria
 * @returns Whether the document matches the filter
 */
function matchesFilter(
  document: IEntity,
  filter: Record<string, any>
): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (document[key] !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Deserialize a document from a database row
 * @param row Database row
 * @returns Deserialized document
 */
function deserializeDocument(row: any): IEntity {
  const data = JSON.parse(row.data);

  return {
    id: row.id,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    ...data,
  };
}
