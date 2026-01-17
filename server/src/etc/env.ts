/**
 * Environment Variables
 *
 * This module provides backward compatibility for direct environment variable access.
 * The CLI (src/cli/config/resolved-config.ts) handles priority resolution:
 * CLI flags > Environment variables > Defaults
 *
 * Environment variables supported:
 * - ABC_PORT, PORT (legacy) - Server port
 * - ABC_HOST - Bind address
 * - ABC_CONFIG, CONFIG_PATH (legacy) - Config file path
 * - ABC_LOG_LEVEL, LOG_LEVEL (legacy) - Log level
 * - ABC_LOG_FORMAT - Log format (pretty|json)
 * - ABC_LOG_FILE - Log file path
 * - ABC_DISABLE_UI - Disable web UI (1|true|yes|on)
 * - ABC_DISABLE_API - Disable management API (1|true|yes|on)
 * - ABC_WATCH - Enable config hot-reload (1|true|yes|on)
 */

import path from "path";

/**
 * Parse a truthy boolean from environment variable
 */
function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

/**
 * Get config path with ABC_* prefix support
 */
function getConfigPath(): string {
  return (
    process.env.ABC_CONFIG ||
    process.env.CONFIG_PATH ||
    path.join(process.cwd(), "data", "config.local.json5")
  );
}

/**
 * Get port with ABC_* prefix support
 */
function getPort(): number {
  const portStr = process.env.ABC_PORT || process.env.PORT || "3000";
  const port = parseInt(portStr, 10);
  return isNaN(port) ? 3000 : port;
}

/**
 * Get log level with ABC_* prefix support
 */
function getLogLevel(): string {
  return process.env.ABC_LOG_LEVEL || process.env.LOG_LEVEL || "info";
}

/**
 * Environment configuration for the server
 *
 * @deprecated Use CLI arguments instead. This is kept for backward compatibility.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: getPort(),
  host: process.env.ABC_HOST || "0.0.0.0",
  configPath: getConfigPath(),
  logLevel: getLogLevel(),
  logFormat: (process.env.ABC_LOG_FORMAT || "pretty") as "pretty" | "json",
  logFile: process.env.ABC_LOG_FILE,
  isProduction: process.env.NODE_ENV === "production",
  enableUi: !isTruthy(process.env.ABC_DISABLE_UI),
  enableApi: !isTruthy(process.env.ABC_DISABLE_API),
  watch: isTruthy(process.env.ABC_WATCH),
} satisfies Arguments;

export type Arguments = {
  nodeEnv: string;
  port: number;
  host: string;
  configPath: string;
  logLevel: string;
  logFormat: "pretty" | "json";
  logFile: string | undefined;
  isProduction: boolean;
  enableUi: boolean;
  enableApi: boolean;
  watch: boolean;
};
