import { logger } from "../utils/logger";
import { env } from "./env";

// Import database implementations
import {
  InMemoryDatabase,
  initializeDatabase as initializeInMemory,
} from "../database/in-memory";
import {
  SQLiteDatabase,
  initializeDatabase as initializeSQLite,
} from "../database/sqlite";

/**
 * Connect to database
 */
export async function connectToDatabase(): Promise<void> {
  try {
    if (env.database.type === "sqlite") {
      // Initialize SQLite database
      SQLiteDatabase.getInstance(env.database.sqlitePath);
      await initializeSQLite();
      logger.info("Connected to SQLite database");
    } else {
      // Initialize in-memory database
      InMemoryDatabase.getInstance();
      await initializeInMemory();
      logger.info("Connected to in-memory database");
    }
  } catch (error) {
    logger.error(`Failed to initialize ${env.database.type} database`, {
      error,
    });
    process.exit(1);
  }
}

/**
 * Disconnect from database
 */
export async function disconnectFromDatabase(): Promise<void> {
  try {
    if (env.database.type === "sqlite") {
      // Close SQLite database
      (SQLiteDatabase.getInstance() as any).close();
      logger.info("Disconnected from SQLite database");
    } else {
      // No-op for in-memory database
      logger.info("Disconnected from in-memory database");
    }
  } catch (error) {
    logger.error(`Failed to clean up ${env.database.type} database`, { error });
  }
}

/**
 * Setup database event handlers
 */
export function setupDatabaseEventHandlers(): void {
  // Process termination
  process.on("SIGINT", async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });
}

/**
 * Get the appropriate database provider based on configuration
 */
export function getDatabaseProvider() {
  return env.database.type === "sqlite"
    ? SQLiteDatabase.getInstance()
    : InMemoryDatabase.getInstance();
}
