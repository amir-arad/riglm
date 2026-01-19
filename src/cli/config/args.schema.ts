import { z } from "zod";

export const LogLevelSchema = z.enum([
  "debug",
  "info",
  "warn",
  "error",
  "silent",
]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogFormatSchema = z.enum(["pretty", "json"]);
export type LogFormat = z.infer<typeof LogFormatSchema>;

export const ServeOptionsSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  host: z.string().optional(),
  config: z.string().optional(),
  logLevel: LogLevelSchema.optional(),
  logFormat: LogFormatSchema.optional(),
  logFile: z.string().optional(),
  noUi: z.boolean().optional(),
  noApi: z.boolean().optional(),
  quiet: z.boolean().optional(),
  verbose: z.boolean().optional(),
});

export type ServeOptions = z.infer<typeof ServeOptionsSchema>;

export const VersionOptionsSchema = z.object({
  json: z.boolean().optional(),
  check: z.boolean().optional(),
});

export type VersionOptions = z.infer<typeof VersionOptionsSchema>;

export const CommandSchema = z.enum(["serve", "version", "help"]);
export type Command = z.infer<typeof CommandSchema>;

export interface ParsedArgs {
  command: Command;
  options: ServeOptions | VersionOptions;
  positionals: string[];
}
