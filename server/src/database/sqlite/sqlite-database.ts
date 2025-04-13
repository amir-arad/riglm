import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { DatabaseProvider, CollectionLike } from "../common/database-provider";
import { SQLiteCollection } from "./sqlite-collection";
import { logger } from "../../utils/logger";

/**
 * SQLite database singleton
 * Provides a central store for all entity collections
 */
export class SQLiteDatabase implements DatabaseProvider {
  private static instance: SQLiteDatabase;
  private db: Database.Database;
  private collections: Map<string, SQLiteCollection<any>> = new Map();
  private idCounters: Map<string, number> = new Map();
  private dbPath: string;

  /**
   * Create a new SQLite database
   * @param dbPath Path to SQLite database file
   */
  private constructor(dbPath: string) {
    this.dbPath = dbPath;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(dbPath, {
      verbose:
        process.env.NODE_ENV === "development" ? logger.debug : undefined,
    });

    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");

    // Initialize id_counters table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS id_counters (
        entity_name TEXT PRIMARY KEY,
        counter INTEGER NOT NULL DEFAULT 1
      )
    `);

    logger.info(`SQLite database initialized at ${dbPath}`);
  }

  /**
   * Get the singleton instance
   * @param dbPath Path to SQLite database file
   * @returns SQLiteDatabase instance
   */
  static getInstance(dbPath?: string): SQLiteDatabase {
    if (!SQLiteDatabase.instance) {
      if (!dbPath) {
        dbPath =
          process.env.SQLITE_DB_PATH ||
          path.join(process.cwd(), "data", "database.sqlite");
      }
      SQLiteDatabase.instance = new SQLiteDatabase(dbPath);
    }
    return SQLiteDatabase.instance;
  }

  /**
   * Get the SQLite database instance
   * @returns SQLite database instance
   */
  getDb(): Database.Database {
    return this.db;
  }

  /**
   * Get a collection for an entity
   * @param entityName Entity name
   * @returns Collection for the entity
   */
  getCollection<T>(entityName: string): CollectionLike<T> {
    if (!this.collections.has(entityName)) {
      // Create table if it doesn't exist
      this.createTable(entityName);

      // Create collection
      const collection = new SQLiteCollection<T>(this.db, entityName);
      this.collections.set(entityName, collection);

      // Initialize id counter
      this.initializeIdCounter(entityName);
    }

    return this.collections.get(entityName) as CollectionLike<T>;
  }

  /**
   * Generate a unique ID for an entity
   * @param entityName Entity name
   * @returns Unique ID
   */
  generateId(entityName: string): string {
    // Get current counter value
    const stmt = this.db.prepare(
      "SELECT counter FROM id_counters WHERE entity_name = ?"
    );
    const row = stmt.get(entityName) as { counter: number } | undefined;

    if (!row) {
      // Initialize counter
      this.initializeIdCounter(entityName);
      return `${entityName}_1`;
    }

    // Increment counter
    const counter = row.counter;
    const updateStmt = this.db.prepare(
      "UPDATE id_counters SET counter = ? WHERE entity_name = ?"
    );
    updateStmt.run(counter + 1, entityName);

    return `${entityName}_${counter}`;
  }

  /**
   * Clear all data (useful for testing)
   */
  clearAll(): void {
    // Get all tables
    const tables = this.db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `
      )
      .all() as { name: string }[];

    // Drop all tables
    const dropTables = this.db.transaction(() => {
      for (const { name } of tables) {
        this.db.prepare(`DROP TABLE IF EXISTS ${name}`).run();
      }
    });

    dropTables();

    // Recreate id_counters table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS id_counters (
        entity_name TEXT PRIMARY KEY,
        counter INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Clear collections
    this.collections.clear();
    this.idCounters.clear();

    logger.info("SQLite database cleared");
  }

  /**
   * Dump all data (useful for debugging)
   * @returns Object containing all collections
   */
  dump(): Record<string, any[]> {
    const result: Record<string, any[]> = {};

    // Get all tables
    const tables = this.db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'id_counters'
    `
      )
      .all() as { name: string }[];

    // Get all data from each table
    for (const { name } of tables) {
      const data = this.db.prepare(`SELECT * FROM ${name}`).all();

      // Convert date strings to Date objects
      data.forEach((item: any) => {
        if (item.createdAt) {
          item.createdAt = new Date(item.createdAt);
        }
        if (item.updatedAt) {
          item.updatedAt = new Date(item.updatedAt);
        }
      });

      result[name] = data;
    }

    return result;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      logger.info("SQLite database connection closed");
    }
  }

  /**
   * Create a table for an entity
   * @param entityName Entity name
   */
  private createTable(entityName: string): void {
    // Check if table exists
    const tableExists = this.db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `
      )
      .get(entityName);

    if (!tableExists) {
      // Create table with basic document fields
      this.db.exec(`
        CREATE TABLE ${entityName} (
          _id TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          data TEXT NOT NULL
        )
      `);

      logger.info(`Created table for entity: ${entityName}`);
    }
  }

  /**
   * Initialize ID counter for an entity
   * @param entityName Entity name
   */
  private initializeIdCounter(entityName: string): void {
    // Check if counter exists
    const counterExists = this.db
      .prepare("SELECT counter FROM id_counters WHERE entity_name = ?")
      .get(entityName);

    if (!counterExists) {
      // Initialize counter
      this.db
        .prepare("INSERT INTO id_counters (entity_name, counter) VALUES (?, 1)")
        .run(entityName);
      this.idCounters.set(entityName, 1);
    } else {
      this.idCounters.set(
        entityName,
        (counterExists as { counter: number }).counter
      );
    }
  }
}
