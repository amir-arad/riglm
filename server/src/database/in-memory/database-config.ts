import { logger } from '../../utils/logger';
import { InMemoryDatabase } from './in-memory-database';

/**
 * Connect to in-memory database
 */
export async function connectToDatabase(): Promise<void> {
  try {
    // Get the database instance (initializes it if not already done)
    InMemoryDatabase.getInstance();
    
    logger.info('Connected to in-memory database');
  } catch (error) {
    logger.error('Failed to initialize in-memory database', { error });
    process.exit(1);
  }
}

/**
 * Disconnect from in-memory database
 */
export async function disconnectFromDatabase(): Promise<void> {
  try {
    // Nothing to do for in-memory database
    logger.info('Disconnected from in-memory database');
  } catch (error) {
    logger.error('Failed to clean up in-memory database', { error });
  }
}

/**
 * Setup database event handlers
 */
export function setupDatabaseEventHandlers(): void {
  // Process termination
  process.on('SIGINT', async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });
}

/**
 * Initialize database with default data
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Clear any existing data
    InMemoryDatabase.getInstance().clearAll();
    
    // Add initialization logic here if needed
    
    logger.info('Initialized in-memory database');
  } catch (error) {
    logger.error('Failed to initialize in-memory database data', { error });
  }
}