

import { z } from "zod";





export const LogLevelSchema = z.enum(["debug", "info", "warn", "error", "silent"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogFormatSchema = z.enum(["pretty", "json"]);
export type LogFormat = z.infer<typeof LogFormatSchema>;

export const TemplateNameSchema = z.enum(["minimal", "standard", "full"]);
export type TemplateName = z.infer<typeof TemplateNameSchema>;

export const OutputFormatSchema = z.enum(["text", "json"]);






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
  watch: z.boolean().optional(),
  dryRun: z.boolean().optional(),
});

export type ServeOptions = z.infer<typeof ServeOptionsSchema>;


export const ValidateOptionsSchema = z.object({
  config: z.string().optional(),
  strict: z.boolean().optional(),
  format: OutputFormatSchema.optional(),
});

export type ValidateOptions = z.infer<typeof ValidateOptionsSchema>;


export const InitOptionsSchema = z.object({
  path: z.string().optional(),
  local: z.boolean().optional(),
  template: TemplateNameSchema.optional(),
  force: z.boolean().optional(),
});

export type InitOptions = z.infer<typeof InitOptionsSchema>;


export const VersionOptionsSchema = z.object({
  json: z.boolean().optional(),
  check: z.boolean().optional(),
});

export type VersionOptions = z.infer<typeof VersionOptionsSchema>;





export const CommandSchema = z.enum(["serve", "validate", "init", "version", "help"]);
export type Command = z.infer<typeof CommandSchema>;






export interface ParsedArgs {
  command: Command;
  options: ServeOptions | ValidateOptions | InitOptions | VersionOptions;
  positionals: string[];
}
