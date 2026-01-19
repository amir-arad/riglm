import type { LogFormat, LogLevel, ServeOptions } from "./args.schema";
import { findConfig, getConfigLocation } from "./config-locator";

export interface ResolvedConfig {
  port: number;
  host: string;
  configPath: string | null;
  extensionsPath: string | null;
  logLevel: typeof LOG_LEVELS[number];
  logFormat: typeof LOG_FORMATS[number];
  logFile: string | undefined;
  enableUi: boolean;
  enableApi: boolean;
  quiet: boolean;
}

const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const;
const LOG_FORMATS = ["pretty", "json"] as const;
const TRUTHY_VALUES = ["1", "true", "yes", "on"];

interface EnvVars {
  riglmPort: number | undefined;
  riglmHost: string | undefined;
  riglmConfig: string | undefined;
  riglmLogLevel: LogLevel | undefined;
  riglmLogFormat: LogFormat | undefined;
  riglmLogFile: string | undefined;
  riglmDisableUi: boolean;
  riglmDisableApi: boolean;

  port: number | undefined;
  configPath: string | undefined;
  logLevel: LogLevel | undefined;
}

function readEnvVars(): EnvVars {
  const parsePort = (v: string | undefined) => {
    if (!v) return undefined;
    const p = parseInt(v, 10);
    return isNaN(p) || p < 1 || p > 65535 ? undefined : p;
  };
  const parseLogLevel = (v: string | undefined) =>
    v && LOG_LEVELS.includes(v.toLowerCase() as LogLevel)
      ? (v.toLowerCase() as LogLevel)
      : undefined;
  const parseLogFormat = (v: string | undefined) =>
    v && LOG_FORMATS.includes(v.toLowerCase() as LogFormat)
      ? (v.toLowerCase() as LogFormat)
      : undefined;
  const isTruthy = (v: string | undefined) =>
    !!v && TRUTHY_VALUES.includes(v.toLowerCase());

  return {
    riglmPort: parsePort(process.env.RIGLM_PORT),
    riglmHost: process.env.RIGLM_HOST || undefined,
    riglmConfig: process.env.RIGLM_CONFIG || undefined,
    riglmLogLevel: parseLogLevel(process.env.RIGLM_LOG_LEVEL),
    riglmLogFormat: parseLogFormat(process.env.RIGLM_LOG_FORMAT),
    riglmLogFile: process.env.RIGLM_LOG_FILE || undefined,
    riglmDisableUi: isTruthy(process.env.RIGLM_DISABLE_UI),
    riglmDisableApi: isTruthy(process.env.RIGLM_DISABLE_API),

    port: parsePort(process.env.PORT),
    configPath: process.env.CONFIG_PATH || undefined,
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
  };
}

export function resolveConfig(cli: ServeOptions): ResolvedConfig {
  const env = readEnvVars();

  const logLevel: LogLevel = cli.verbose
    ? "debug"
    : (cli.logLevel ?? env.riglmLogLevel ?? env.logLevel ?? "info");

  let configPath: string | null = null;
  let extensionsPath: string | null = null;

  const explicitPath = cli.config ?? env.riglmConfig ?? env.configPath;
  if (explicitPath) {
    const location = getConfigLocation(explicitPath);
    configPath = location.configPath;
    extensionsPath = location.extensionsPath;
  } else {
    const found = findConfig();
    if (found) {
      configPath = found.configPath;
      extensionsPath = found.extensionsPath;
    }
  }

  const enableUi = cli.noUi ? false : !env.riglmDisableUi;
  const enableApi = cli.noApi ? false : !env.riglmDisableApi;

  return {
    port: cli.port ?? env.riglmPort ?? env.port ?? 3000,
    host: cli.host ?? env.riglmHost ?? "0.0.0.0",
    configPath,
    extensionsPath,
    logLevel,
    logFormat: cli.logFormat ?? env.riglmLogFormat ?? "pretty",
    logFile: cli.logFile ?? env.riglmLogFile,
    enableUi,
    enableApi,
    quiet: cli.quiet ?? false,
  };
}
