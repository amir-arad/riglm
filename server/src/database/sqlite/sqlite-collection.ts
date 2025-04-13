import Database from "better-sqlite3";
import { CollectionLike } from "../common/database-provider";

/**
 * SQLite collection implementation
 * Provides a Map-like interface for SQLite tables
 */
export class SQLiteCollection<T> implements CollectionLike<T> {
  private db: Database.Database;
  private tableName: string;

  /**
   * Create a new SQLite collection
   * @param db SQLite database
   * @param tableName Table name
   */
  constructor(db: Database.Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Get a document by ID
   * @param id Document ID
   * @returns Document or undefined if not found
   */
  get(id: string): T | undefined {
    const stmt = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE _id = ?`
    );
    const row = stmt.get(id) as any;

    if (!row) {
      return undefined;
    }

    // Parse data field
    const data = JSON.parse(row.data);

    // Merge with document fields
    const document = {
      _id: row._id,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      ...data,
    } as T;

    return document;
  }

  /**
   * Set a document
   * @param id Document ID
   * @param value Document
   */
  set(id: string, value: T): void {
    // Extract document fields
    const { _id, createdAt, updatedAt, ...data } = value as any;

    // Check if document exists
    const exists = this.get(id);

    if (exists) {
      // Update document
      const stmt = this.db.prepare(`
        UPDATE ${this.tableName}
        SET updatedAt = ?, data = ?
        WHERE _id = ?
      `);

      stmt.run(updatedAt.toISOString(), JSON.stringify(data), id);
    } else {
      // Insert document
      const stmt = this.db.prepare(`
        INSERT INTO ${this.tableName} (_id, createdAt, updatedAt, data)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        id,
        createdAt.toISOString(),
        updatedAt.toISOString(),
        JSON.stringify(data)
      );
    }
  }

  /**
   * Delete a document
   * @param id Document ID
   * @returns Whether the document was deleted
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE _id = ?`);
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Get all documents
   * @returns Iterator of document entries
   */
  entries(): IterableIterator<[string, T]> {
    const documents = this.getAllDocuments();

    // Create a custom iterator that yields [string, T] pairs
    const entriesIterator = function* (docs: T[]): Generator<[string, T]> {
      for (const doc of docs) {
        yield [(doc as any)._id as string, doc];
      }
    };

    return entriesIterator(documents);
  }

  /**
   * Get all documents
   * @returns Iterator of documents
   */
  values(): IterableIterator<T> {
    const documents = this.getAllDocuments();
    return documents[Symbol.iterator]();
  }

  /**
   * Get all documents
   * @returns Array of documents
   */
  private getAllDocuments(): T[] {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName}`);
    const rows = stmt.all() as any[];

    return rows.map((row: any) => {
      // Parse data field
      const data = JSON.parse(row.data);

      // Merge with document fields
      return {
        _id: row._id,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        ...data,
      } as T;
    });
  }
}
