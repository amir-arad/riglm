import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? ".env" : ".local.env"
  ),
  override: true,
  debug: process.env.NODE_ENV !== "production",
  encoding: "utf8",
});

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  configPath:
    process.env.CONFIG_PATH || path.join(process.cwd(), "config.json"),
  logLevel: process.env.LOG_LEVEL || "info",
  isProduction: process.env.NODE_ENV === "production",
  zepApiKey: process.env.ZEP_API_KEY || "",
} satisfies Arguments;

export type Arguments = {
  nodeEnv: string;
  port: number;
  configPath: string;
  logLevel: string;
  isProduction: boolean;
  zepApiKey: string;
};
