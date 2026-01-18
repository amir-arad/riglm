/**
 * Startup Banner
 *
 * Displays server startup information with box drawing.
 * @see docs/cli-design.md for specification
 */

import type { Config } from "../../domain/types";
import type { ResolvedConfig } from "../config/resolved-config";

// ============================================================================
// Types
// ============================================================================

export interface BannerInfo {
  version: string;
  config: ResolvedConfig;
  appConfig: Config | null;
}

// ============================================================================
// Box Drawing
// ============================================================================

const BOX = {
  topLeft: "\u256D",     // ╭
  topRight: "\u256E",    // ╮
  bottomLeft: "\u2570",  // ╰
  bottomRight: "\u256F", // ╯
  horizontal: "\u2500",  // ─
  vertical: "\u2502",    // │
};

/**
 * Create a box around text lines
 */
function createBox(lines: string[], width: number): string[] {
  const output: string[] = [];
  const innerWidth = width - 2;

  // Top border
  output.push(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight);

  // Content lines
  for (const line of lines) {
    const padding = innerWidth - line.length;
    output.push(BOX.vertical + "  " + line + " ".repeat(Math.max(0, padding - 2)) + BOX.vertical);
  }

  // Bottom border
  output.push(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight);

  return output;
}

// ============================================================================
// Banner Generation
// ============================================================================

/**
 * Print the full startup banner
 */
export function printBanner(info: BannerInfo): void {
  const { version, config, appConfig } = info;

  // Header box
  const headerLines = [
    `Riglm v${version}`,
    "AI Extension Manager",
  ];
  const box = createBox(headerLines, 50);
  console.log(box.join("\n"));
  console.log();

  // Configuration details
  if (config.configPath) {
    console.log(`  Config:     ${config.configPath}`);
  } else {
    console.log("  Config:     (no configuration file found)");
  }

  // Show endpoints and servers if config is loaded
  if (appConfig) {
    const endpointNames = Object.keys(appConfig.endpoints || {});
    const serverCount = Object.keys(appConfig.servers || {}).length;
    const localServers = Object.values(appConfig.servers || {}).filter(
      (s) => "command" in s
    ).length;
    const remoteServers = serverCount - localServers;

    if (endpointNames.length > 0) {
      console.log(`  Endpoints:  ${endpointNames.join(", ")}`);
    }
    if (serverCount > 0) {
      console.log(
        `  Servers:    ${serverCount} configured (${localServers} local, ${remoteServers} remote)`
      );
    }
  }

  console.log();

  // URLs
  const baseUrl = config.host === "0.0.0.0" ? "localhost" : config.host;
  console.log(`  MCP:        http://${baseUrl}:${config.port}/:endpoint/sse`);

  if (config.enableUi) {
    console.log(`  Web UI:     http://${baseUrl}:${config.port}/ui`);
  }

  if (config.enableApi) {
    console.log(`  API:        http://${baseUrl}:${config.port}/api`);
  }

  console.log();
  console.log("  Press Ctrl+C to stop");
  console.log();
}

/**
 * Print a minimal startup message (used with --quiet)
 */
export function printQuietBanner(config: ResolvedConfig): void {
  const baseUrl = config.host === "0.0.0.0" ? "localhost" : config.host;
  console.log(`Riglm listening on http://${baseUrl}:${config.port}`);
}

/**
 * Print dry-run output showing effective configuration
 */
export function printDryRun(info: BannerInfo): void {
  const { version, config, appConfig } = info;

  console.log(`Riglm v${version} - Dry Run`);
  console.log("═".repeat(50));
  console.log();

  console.log("Resolved Configuration:");
  console.log(`  Port:       ${config.port}`);
  console.log(`  Host:       ${config.host}`);
  console.log(`  Config:     ${config.configPath ?? "(not found)"}`);
  console.log(`  Log Level:  ${config.logLevel}`);
  console.log(`  Log Format: ${config.logFormat}`);
  if (config.logFile) {
    console.log(`  Log File:   ${config.logFile}`);
  }
  console.log(`  Web UI:     ${config.enableUi ? "enabled" : "disabled"}`);
  console.log(`  API:        ${config.enableApi ? "enabled" : "disabled"}`);
  console.log(`  Watch:      ${config.watch ? "enabled" : "disabled"}`);

  console.log();

  if (appConfig) {
    console.log("Configuration File:");
    const endpointNames = Object.keys(appConfig.endpoints || {});
    const serverNames = Object.keys(appConfig.servers || {});

    console.log(`  Endpoints:  [${endpointNames.join(", ")}]`);
    console.log(`  Servers:    [${serverNames.join(", ")}]`);

    if (appConfig.filters && appConfig.filters.length > 0) {
      console.log(`  Filters:    [${appConfig.filters.join(", ")}]`);
    }
  } else {
    console.log("Configuration File: Not loaded or not found");
  }

  console.log();
  console.log("Dry run complete. Server was not started.");
}
