/**
 * Mock Logger for testing
 */

import { LoggerPort } from "../../src/ports/logger.port";

/**
 * Create a mock logger that captures log calls
 */
export function createMockLogger(options?: {
  captureAll?: boolean;
  realLogger?: LoggerPort;
}): LoggerPort & { calls: { level: string; message: string; meta: unknown[] }[] } {
  const calls: { level: string; message: string; meta: unknown[] }[] = [];

  const capture = (level: string) => (message: string, ...meta: unknown[]) => {
    calls.push({ level, message, meta });
    if (options?.realLogger) {
      (options.realLogger as any)[level](message, ...meta);
    }
  };

  return {
    calls,
    info: capture("info"),
    warn: capture("warn"),
    error: capture("error"),
    debug: capture("debug"),
    child: (_meta: Record<string, unknown>) => createMockLogger(options),
  };
}

/**
 * Create a silent mock logger (no output)
 */
export function createSilentLogger(): LoggerPort {
  const noop = () => {};
  return {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    child: () => createSilentLogger(),
  };
}
