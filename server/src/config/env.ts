import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Environment configuration
 */
export const env = {
  /**
   * Node environment
   */
  nodeEnv: process.env.NODE_ENV || "development",

  /**
   * Server port
   */
  port: parseInt(process.env.PORT || "3000", 10),

  /**
   * Database configuration
   */
  database: {
    /**
     * Database type
     * Can be 'in-memory' or 'sqlite'
     */
    type: process.env.DB_TYPE || "in-memory",

    /**
     * SQLite database path
     * Only used when type is 'sqlite'
     */
    sqlitePath:
      process.env.SQLITE_DB_PATH ||
      path.join(process.cwd(), "data", "database.sqlite"),
  },

  /**
   * JWT configuration
   */
  jwt: {
    /**
     * JWT secret key
     */
    secret:
      process.env.JWT_SECRET || "default_jwt_secret_key_change_in_production",

    /**
     * JWT expiration time
     */
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },

  /**
   * OAuth configuration
   */
  oauth: {
    /**
     * OAuth client ID
     */
    clientId: process.env.OAUTH_CLIENT_ID || "",

    /**
     * OAuth client secret
     */
    clientSecret: process.env.OAUTH_CLIENT_SECRET || "",

    /**
     * OAuth callback URL
     */
    callbackUrl:
      process.env.OAUTH_CALLBACK_URL ||
      "http://localhost:3000/api/auth/callback",
  },

  /**
   * Logging configuration
   */
  logging: {
    /**
     * Log level
     */
    level: process.env.LOG_LEVEL || "info",
  },

  /**
   * CORS configuration
   */
  cors: {
    /**
     * CORS origin
     */
    origin: process.env.CORS_ORIGIN || "*",
  },

  /**
   * Allowed redirect domains for SSO login
   * This helps prevent open redirect vulnerabilities
   * If empty, all domains are allowed (not recommended for production)
   */
  allowedRedirectDomains: process.env.ALLOWED_REDIRECT_DOMAINS
    ? process.env.ALLOWED_REDIRECT_DOMAINS.split(",")
    : [],

  /**
   * Check if environment is production
   */
  isProduction: process.env.NODE_ENV === "production",

  /**
   * Check if environment is development
   */
  isDevelopment:
    process.env.NODE_ENV === "development" || !process.env.NODE_ENV,
};
