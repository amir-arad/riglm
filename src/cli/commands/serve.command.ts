/**
 * Serve Command
 *
 * Starts the Riglm server with the resolved configuration.
 * @see docs/cli-design.md for specification
 */

import { existsSync, readFileSync } from "fs";
import JSON5 from "json5";
import type { ServeOptions } from "../config/args.schema";
import { resolveConfig, type ResolvedConfig } from "../config/resolved-config";
import { env } from "../../etc/env";
import { ExitCode, exit } from "../output/exit-codes";
import { printBanner, printQuietBanner, printDryRun } from "../output/banner";
import { getVersion } from "./version.command";
import { ValidatedConfigSchema } from "../../domain/config-resolver";
import type { Config } from "../../domain/types";

// Adapters
import { createWinstonLoggerAdapter } from "../../adapters/logging/winston.adapter";
import { createFileConfigAdapter } from "../../adapters/storage/file-config.adapter";
import { McpClientFactoryAdapter } from "../../adapters/mcp/mcp-client.adapter";
import { McpServerFactoryAdapter } from "../../adapters/mcp/mcp-server.adapter";
import { ClientTransportFactoryAdapter } from "../../adapters/mcp/transports";

// Server
import { RiglmServer } from "../../server";

// ============================================================================
// Config Loading
// ============================================================================

/**
 * Load and parse configuration file
 */
function loadConfigFile(configPath: string): Config | null {
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const rawConfig = JSON5.parse(content);

    // Validate with Zod
    const result = ValidatedConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      console.error("Configuration validation failed:");
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
      }
      return null;
    }

    return result.data;
  } catch (error) {
    console.error(`Failed to load config: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// ============================================================================
// Server Startup
// ============================================================================

/**
 * Server runtime with cleanup function
 */
export interface ServerRuntime {
  close: () => Promise<void>;
}

/**
 * Start the server with the given configuration
 * Returns a runtime object with cleanup function for signal handlers
 */
async function startServer(config: ResolvedConfig, _appConfig: Config): Promise<ServerRuntime> {
  // Create logger adapter with CLI options
  const logger = createWinstonLoggerAdapter({
    logLevel: config.logLevel,
    isProduction: env.isProduction,
    logFormat: config.logFormat,
    logFile: config.logFile,
  });

  // Create config adapter
  // Note: We already loaded and validated the config, so we use a wrapper
  const configAdapter = createFileConfigAdapter(config.configPath!, logger);

  // Pre-load the config (it's already validated)
  try {
    configAdapter.load();
  } catch (error) {
    logger.error("Failed to load configuration", { error });
    exit(ExitCode.INVALID_CONFIG);
  }

  // Create MCP adapters
  const clientFactory = new McpClientFactoryAdapter();
  const serverFactory = new McpServerFactoryAdapter();
  const transportFactory = new ClientTransportFactoryAdapter();

  // Create and start server
  const server = new RiglmServer({
    config: configAdapter,
    clientFactory,
    serverFactory,
    transportFactory,
    logger: logger.child({ service: "riglm" }),
    env: {
      port: config.port,
      host: config.host,
      isProduction: env.isProduction,
      enableUi: config.enableUi,
      enableApi: config.enableApi,
    },
  });

  // Start the server
  try {
    await server.start();
  } catch (error) {
    logger.error("Failed to start server", { error });
    exit(ExitCode.RUNTIME_ERROR);
  }

  // Return runtime with cleanup function
  return {
    close: async () => {
      logger.info("Shutting down server...");
      await server.close();
    },
  };
}

// ============================================================================
// Command Implementation
// ============================================================================

/**
 * Execute the serve command
 * Returns a runtime object for signal handlers (null if dry-run or error)
 */
export async function serveCommand(options: ServeOptions): Promise<ServerRuntime | null> {
  // Resolve configuration with priority chain
  const config = resolveConfig(options);
  const version = getVersion();

  // Check if config exists
  if (!config.configPath) {
    if (!config.quiet) {
      console.error("No configuration file found.");
      console.error("");
      console.error("Searched locations:");
      console.error("  1. ./.riglm/config.json5");
      console.error("  2. ~/.config/riglm/config.json5");
      console.error("");
      console.error("Create one with: riglm init");
      console.error("Or specify with: riglm serve -c <path>");
    }
    exit(ExitCode.CONFIG_NOT_FOUND);
  }

  // Load and validate config
  const appConfig = loadConfigFile(config.configPath);
  if (!appConfig) {
    console.error(`Failed to load configuration from: ${config.configPath}`);
    exit(ExitCode.INVALID_CONFIG);
  }

  // Dry run mode - just show config and exit
  if (config.dryRun) {
    printDryRun({ version, config, appConfig });
    return null;
  }

  // Watch mode stub
  if (config.watch) {
    console.log("Warning: --watch mode is not yet implemented.");
    console.log("");
  }

  // Print startup banner
  if (config.quiet) {
    printQuietBanner(config);
  } else {
    printBanner({ version, config, appConfig });
  }

  // Start the server and return runtime
  return startServer(config, appConfig);
}
