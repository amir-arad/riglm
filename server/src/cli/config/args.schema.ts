/**
 * CLI Arguments Schema
 *
 * Zod schemas for CLI argument validation.
 * @see docs/cli-design.md for specification
 */

import { z } from "zod";

// ============================================================================
// Shared Types
// ============================================================================

export const LogLevelSchema = z.enum(["debug", "info", "warn", "error", "silent"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogFormatSchema = z.enum(["pretty", "json"]);
export type LogFormat = z.infer<typeof LogFormatSchema>;

export const TemplateNameSchema = z.enum(["minimal", "standard", "full"]);
export type TemplateName = z.infer<typeof TemplateNameSchema>;

export const OutputFormatSchema = z.enum(["text", "json"]);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

// ============================================================================
// Command Schemas
// ============================================================================

/**
 * Options for the `serve` command
 */
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

/**
 * Options for the `validate` command
 */
export const ValidateOptionsSchema = z.object({
  config: z.string().optional(),
  strict: z.boolean().optional(),
  format: OutputFormatSchema.optional(),
});

export type ValidateOptions = z.infer<typeof ValidateOptionsSchema>;

/**
 * Options for the `init` command
 */
export const InitOptionsSchema = z.object({
  path: z.string().optional(),
  local: z.boolean().optional(),
  template: TemplateNameSchema.optional(),
  force: z.boolean().optional(),
});

export type InitOptions = z.infer<typeof InitOptionsSchema>;

/**
 * Options for the `version` command
 */
export const VersionOptionsSchema = z.object({
  json: z.boolean().optional(),
  check: z.boolean().optional(),
});

export type VersionOptions = z.infer<typeof VersionOptionsSchema>;

// ============================================================================
// Command Type
// ============================================================================

export const CommandSchema = z.enum(["serve", "validate", "init", "version", "help"]);
export type Command = z.infer<typeof CommandSchema>;

// ============================================================================
// Parsed CLI Arguments
// ============================================================================

/**
 * Fully parsed CLI arguments
 */
export interface ParsedArgs {
  command: Command;
  options: ServeOptions | ValidateOptions | InitOptions | VersionOptions;
  positionals: string[];
}
