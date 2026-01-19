

import path from "path";


function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}


function getConfigPath(): string {
  return (
    process.env.RIGLM_CONFIG ||
    process.env.CONFIG_PATH ||
    path.join(process.cwd(), "data", "config.local.json5")
  );
}


function getPort(): number {
  const portStr = process.env.RIGLM_PORT || process.env.PORT || "3000";
  const port = parseInt(portStr, 10);
  return isNaN(port) ? 3000 : port;
}


function getLogLevel(): string {
  return process.env.RIGLM_LOG_LEVEL || process.env.LOG_LEVEL || "info";
}


export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: getPort(),
  host: process.env.RIGLM_HOST || "0.0.0.0",
  configPath: getConfigPath(),
  logLevel: getLogLevel(),
  logFormat: (process.env.RIGLM_LOG_FORMAT || "pretty") as "pretty" | "json",
  logFile: process.env.RIGLM_LOG_FILE,
  isProduction: process.env.NODE_ENV === "production",
  enableUi: !isTruthy(process.env.RIGLM_DISABLE_UI),
  enableApi: !isTruthy(process.env.RIGLM_DISABLE_API),
  watch: isTruthy(process.env.RIGLM_WATCH),
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
