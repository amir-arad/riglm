import dotenv from "dotenv";
import path from "path";

dotenv.config(); // { path: path.resolve(process.cwd(), ".env") }

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  configPath:
    process.env.CONFIG_PATH || path.join(process.cwd(), "config.json"),
  logLevel: process.env.LOG_LEVEL || "info",
  isProduction: process.env.NODE_ENV === "production",
} satisfies Arguments;

export type Arguments = {
  nodeEnv: string;
  port: number;
  configPath: string;
  logLevel: string;
  isProduction: boolean;
};
