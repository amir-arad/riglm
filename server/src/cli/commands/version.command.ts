/**
 * Version Command
 *
 * Displays version information about the server and its dependencies.
 * @see docs/cli-design.md for specification
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { VersionOptions } from "../config/args.schema";
import { ExitCode, exit } from "../output/exit-codes";

// ============================================================================
// Types
// ============================================================================

interface VersionInfo {
  version: string;
  runtime: string;
  runtimeVersion: string;
  mcpSdk: string;
}

// ============================================================================
// Version Detection
// ============================================================================

/**
 * Get the package version from package.json
 */
function getPackageVersion(): string {
  try {
    // Try to read from package.json (works in development)
    const packagePath = join(__dirname, "../../../package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version || "0.0.0";
  } catch {
    // Fallback for standalone builds
    return "1.0.0";
  }
}

/**
 * Get the MCP SDK version from package.json
 */
function getMcpSdkVersion(): string {
  try {
    const packagePath = join(__dirname, "../../../package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    const mcpDep = packageJson.dependencies?.["@modelcontextprotocol/sdk"];
    // Remove ^ or ~ prefix if present
    return mcpDep?.replace(/^[\^~]/, "") || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Detect runtime environment
 */
function detectRuntime(): { name: string; version: string } {
  // Check for Bun
  if (typeof Bun !== "undefined") {
    return { name: "Bun", version: Bun.version };
  }
  // Fallback to Node.js
  return { name: "Node.js", version: process.version.replace("v", "") };
}

/**
 * Collect all version information
 */
function getVersionInfo(): VersionInfo {
  const runtime = detectRuntime();
  return {
    version: getPackageVersion(),
    runtime: runtime.name,
    runtimeVersion: runtime.version,
    mcpSdk: getMcpSdkVersion(),
  };
}

// ============================================================================
// Command Implementation
// ============================================================================

/**
 * Execute the version command
 */
export async function versionCommand(options: VersionOptions): Promise<void> {
  const info = getVersionInfo();

  if (options.json) {
    // JSON output
    console.log(
      JSON.stringify(
        {
          abc: info.version,
          runtime: info.runtime,
          runtimeVersion: info.runtimeVersion,
          mcpSdk: info.mcpSdk,
        },
        null,
        2
      )
    );
  } else {
    // Human-readable output
    console.log(`abc v${info.version}`);
    console.log(`Runtime: ${info.runtime} ${info.runtimeVersion}`);
    console.log(`MCP SDK: @modelcontextprotocol/sdk ${info.mcpSdk}`);
  }

  exit(ExitCode.SUCCESS);
}

/**
 * Export version for use by other modules
 */
export function getVersion(): string {
  return getPackageVersion();
}
