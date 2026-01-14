/**
 * Logger Port - Abstracts logging implementation
 * Domain services depend on this interface, not concrete loggers.
 */

/**
 * Standard logging interface with leveled methods.
 * Implementations may use Winston, Pino, console, or any other logger.
 */
export interface LoggerPort {
  /**
   * Log informational message
   */
  info(message: string, ...meta: unknown[]): void;

  /**
   * Log warning message
   */
  warn(message: string, ...meta: unknown[]): void;

  /**
   * Log error message
   */
  error(message: string, ...meta: unknown[]): void;

  /**
   * Log debug message
   */
  debug(message: string, ...meta: unknown[]): void;

  /**
   * Create a child logger with additional context metadata
   * @param meta Additional metadata to include in all log messages
   * @returns New logger instance with merged metadata
   */
  child(meta: Record<string, unknown>): LoggerPort;
}
