import { SQLiteDatabase } from "./sqlite-database";
import { logger } from "../../utils/logger";

/**
 * Initialize the SQLite database with default data
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info("Initializing SQLite database with default data");

    // Get database instance
    const db = SQLiteDatabase.getInstance();

    // Add any default data here
    // For example:
    // const usersCollection = db.getCollection<UserDocument>('User');
    // const adminUser = await UserModel.findOne({ email: 'admin@example.com' });
    // if (!adminUser) {
    //   await UserModel.create({
    //     email: 'admin@example.com',
    //     password: 'admin123',
    //     role: 'admin',
    //     name: 'Admin User'
    //   });
    // }

    logger.info("SQLite database initialization complete");
  } catch (error) {
    logger.error("Error initializing SQLite database", { error });
    throw error;
  }
}
