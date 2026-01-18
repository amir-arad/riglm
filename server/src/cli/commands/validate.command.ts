/**
 * Validate Command
 *
 * Validates configuration files without starting the server.
 * @see docs/cli-design.md for specification
 */

import { existsSync, readFileSync } from "fs";
import JSON5 from "json5";
import type { ValidateOptions } from "../config/args.schema";
import { findConfig, getConfigLocation } from "../config/config-locator";
import { ExitCode, exit } from "../output/exit-codes";
import { ValidatedConfigSchema } from "../../domain/config-resolver";
import type { Config } from "../../domain/types";

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  valid: boolean;
  configPath: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  config?: Config;
}

interface ValidationError {
  path: string;
  message: string;
}

interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

// ============================================================================
// Validation Logic
// ============================================================================

/**
 * Check for common warnings in the configuration
 */
function checkWarnings(config: Config): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check for environment variable references that might be missing
  for (const [serverName, server] of Object.entries(config.servers)) {
    if ("env" in server && server.env) {
      for (const [key, value] of Object.entries(server.env)) {
        // Check for ${VAR} patterns that might not be resolved
        if (typeof value === "string" && value.startsWith("${") && value.endsWith("}")) {
          const varName = value.slice(2, -1);
          if (!process.env[varName]) {
            warnings.push({
              path: `servers.${serverName}.env.${key}`,
              message: `Environment variable "${varName}" is not set`,
              code: "MISSING_ENV_VAR",
            });
          }
        }
      }
    }
  }

  // Check for empty endpoints
  for (const [endpointName, endpoint] of Object.entries(config.endpoints)) {
    if (endpoint.servers.length === 0) {
      warnings.push({
        path: `endpoints.${endpointName}.servers`,
        message: "Endpoint has no servers configured",
        code: "EMPTY_ENDPOINT",
      });
    }
  }

  return warnings;
}

/**
 * Parse and validate a configuration file
 */
function validateConfigFile(configPath: string): ValidationResult {
  const result: ValidationResult = {
    valid: false,
    configPath,
    errors: [],
    warnings: [],
  };

  // Check if file exists
  if (!existsSync(configPath)) {
    result.errors.push({
      path: configPath,
      message: "Configuration file not found",
    });
    return result;
  }

  // Read and parse the file
  let rawConfig: unknown;
  try {
    const content = readFileSync(configPath, "utf-8");
    rawConfig = JSON5.parse(content);
  } catch (error) {
    result.errors.push({
      path: configPath,
      message: error instanceof Error ? `Parse error: ${error.message}` : "Failed to parse configuration file",
    });
    return result;
  }

  // Validate with Zod schema
  const parseResult = ValidatedConfigSchema.safeParse(rawConfig);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      result.errors.push({
        path: issue.path.join(".") || configPath,
        message: issue.message,
      });
    }
    return result;
  }

  // Config is valid
  result.valid = true;
  result.config = parseResult.data;
  result.warnings = checkWarnings(parseResult.data);

  return result;
}

// ============================================================================
// Output Formatting
// ============================================================================

/**
 * Format validation result as text
 */
function formatText(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push(`\u2713 Configuration is valid: ${result.configPath}`);

    if (result.config) {
      const serverCount = Object.keys(result.config.servers).length;
      const endpointCount = Object.keys(result.config.endpoints).length;
      lines.push(`  Servers: ${serverCount}`);
      lines.push(`  Endpoints: ${endpointCount}`);
    }

    if (result.warnings.length > 0) {
      lines.push("");
      lines.push("Warnings:");
      for (const warning of result.warnings) {
        lines.push(`  \u26A0 ${warning.path}: ${warning.message}`);
      }
    }
  } else {
    lines.push(`\u2717 Configuration is invalid: ${result.configPath}`);
    lines.push("");
    lines.push("Errors:");
    for (const error of result.errors) {
      lines.push(`  \u2717 ${error.path}: ${error.message}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format validation result as JSON
 */
function formatJson(result: ValidationResult): string {
  return JSON.stringify(
    {
      valid: result.valid,
      configPath: result.configPath,
      errors: result.errors,
      warnings: result.warnings,
      serverCount: result.config ? Object.keys(result.config.servers).length : 0,
      endpointCount: result.config ? Object.keys(result.config.endpoints).length : 0,
    },
    null,
    2
  );
}

// ============================================================================
// Command Implementation
// ============================================================================

/**
 * Execute the validate command
 */
export async function validateCommand(options: ValidateOptions): Promise<void> {
  const format = options.format ?? "text";

  // Determine config path
  let configPath: string | null = null;

  if (options.config) {
    const location = getConfigLocation(options.config);
    configPath = location.configPath;
  } else {
    const found = findConfig();
    if (found) {
      configPath = found.configPath;
    }
  }

  // Check if config was found
  if (!configPath) {
    if (format === "json") {
      console.log(
        JSON.stringify(
          {
            valid: false,
            configPath: null,
            errors: [{ path: "", message: "No configuration file found" }],
            warnings: [],
          },
          null,
          2
        )
      );
    } else {
      console.error("No configuration file found.");
      console.error("");
      console.error("Searched locations:");
      console.error("  1. ./.riglm/config.json5");
      console.error("  2. ~/.config/riglm/config.json5");
      console.error("");
      console.error("Use -c <path> to specify a configuration file.");
    }
    exit(ExitCode.CONFIG_NOT_FOUND);
  }

  // Validate the config
  const result = validateConfigFile(configPath);

  // Output result
  if (format === "json") {
    console.log(formatJson(result));
  } else {
    console.log(formatText(result));
  }

  // Determine exit code
  if (!result.valid) {
    exit(ExitCode.INVALID_CONFIG);
  }

  if (options.strict && result.warnings.length > 0) {
    if (format !== "json") {
      console.log("");
      console.log("Validation failed: warnings present with --strict mode");
    }
    exit(ExitCode.WARNINGS_STRICT);
  }

  exit(ExitCode.SUCCESS);
}
