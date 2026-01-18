/**
 * CLI Entry Point
 *
 * Parses command-line arguments and routes to appropriate command handlers.
 * Uses Node's built-in util.parseArgs (available in Bun).
 *
 * @see docs/cli-design.md for specification
 */

import type {
  Command,
  InitOptions,
  ParsedArgs,
  ServeOptions,
  ValidateOptions,
  VersionOptions,
} from "./config/args.schema";
import { ExitCode, exit } from "./output/exit-codes";

import { initCommand } from "./commands/init.command";
import { parseArgs as nodeParseArgs } from "util";
import { printHelp } from "./output/help";
import { serveCommand, type ServerRuntime } from "./commands/serve.command";
import { validateCommand } from "./commands/validate.command";
import { versionCommand } from "./commands/version.command";

// ============================================================================
// Argument Parsing
// ============================================================================

/**
 * Parse CLI arguments using Node's util.parseArgs
 */
export function parseArgs(argv: string[]): ParsedArgs {
  // First pass: extract command and check for global options
  const firstArg = argv[0];
  const commands: Command[] = ["serve", "validate", "init", "version", "help"];

  let command: Command = "serve"; // Default command
  let argsToProcess = argv;

  if (firstArg && commands.includes(firstArg as Command)) {
    command = firstArg as Command;
    argsToProcess = argv.slice(1);
  } else if (firstArg === "--help" || firstArg === "-h") {
    command = "help";
    argsToProcess = [];
  } else if (firstArg === "--version" || firstArg === "-V") {
    command = "version";
    argsToProcess = [];
  }

  // Parse command-specific options
  switch (command) {
    case "serve":
      return parseServeArgs(argsToProcess);
    case "validate":
      return parseValidateArgs(argsToProcess);
    case "init":
      return parseInitArgs(argsToProcess);
    case "version":
      return parseVersionArgs(argsToProcess);
    case "help":
      return { command: "help", options: {}, positionals: [] };
    default:
      return { command: "serve", options: {}, positionals: [] };
  }
}

/**
 * Parse serve command options
 */
function parseServeArgs(argv: string[]): ParsedArgs {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    options: {
      port: { type: "string", short: "p" },
      host: { type: "string", short: "H" },
      config: { type: "string", short: "c" },
      "log-level": { type: "string", short: "l" },
      "log-format": { type: "string" },
      "log-file": { type: "string" },
      "no-ui": { type: "boolean" },
      "no-api": { type: "boolean" },
      quiet: { type: "boolean", short: "q" },
      verbose: { type: "boolean", short: "v" },
      watch: { type: "boolean", short: "w" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false, // Allow unknown options for flexibility
  });

  // Check for help flag
  if (values.help) {
    return { command: "help", options: {}, positionals: [] };
  }

  const options: ServeOptions = {
    port: values.port ? parseInt(values.port as string, 10) : undefined,
    host: values.host as string | undefined,
    config: values.config as string | undefined,
    logLevel: values["log-level"] as ServeOptions["logLevel"],
    logFormat: values["log-format"] as ServeOptions["logFormat"],
    logFile: values["log-file"] as string | undefined,
    noUi: values["no-ui"] as boolean | undefined,
    noApi: values["no-api"] as boolean | undefined,
    quiet: values.quiet as boolean | undefined,
    verbose: values.verbose as boolean | undefined,
    watch: values.watch as boolean | undefined,
    dryRun: values["dry-run"] as boolean | undefined,
  };

  return { command: "serve", options, positionals };
}

/**
 * Parse validate command options
 */
function parseValidateArgs(argv: string[]): ParsedArgs {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    options: {
      config: { type: "string", short: "c" },
      strict: { type: "boolean" },
      format: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    return { command: "help", options: {}, positionals: [] };
  }

  const options: ValidateOptions = {
    config: values.config as string | undefined,
    strict: values.strict as boolean | undefined,
    format: values.format as ValidateOptions["format"],
  };

  return { command: "validate", options, positionals };
}

/**
 * Parse init command options
 */
function parseInitArgs(argv: string[]): ParsedArgs {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    options: {
      path: { type: "string", short: "p" },
      local: { type: "boolean" },
      template: { type: "string", short: "t" },
      force: { type: "boolean", short: "f" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    return { command: "help", options: {}, positionals: [] };
  }

  const options: InitOptions = {
    path: values.path as string | undefined,
    local: values.local as boolean | undefined,
    template: values.template as InitOptions["template"],
    force: values.force as boolean | undefined,
  };

  return { command: "init", options, positionals };
}

/**
 * Parse version command options
 */
function parseVersionArgs(argv: string[]): ParsedArgs {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    options: {
      json: { type: "boolean" },
      check: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    return { command: "help", options: {}, positionals: [] };
  }

  const options: VersionOptions = {
    json: values.json as boolean | undefined,
    check: values.check as boolean | undefined,
  };

  return { command: "version", options, positionals };
}

// ============================================================================
// Command Routing
// ============================================================================

/**
 * Route to appropriate command handler
 * Returns runtime if serve command started successfully (for signal handlers)
 */
export async function runCli(argv: string[]): Promise<ServerRuntime | null> {
  const parsed = parseArgs(argv);

  switch (parsed.command) {
    case "serve": {
      const runtime = await serveCommand(parsed.options as ServeOptions);
      if (!runtime) {
        // Dry-run or error - exit cleanly
        exit(ExitCode.SUCCESS);
      }
      return runtime;
    }
    case "validate":
      await validateCommand(parsed.options as ValidateOptions);
      break;
    case "init":
      await initCommand(parsed.options as InitOptions);
      break;
    case "version":
      await versionCommand(parsed.options as VersionOptions);
      break;
    case "help":
      printHelp();
      exit(ExitCode.SUCCESS);
    default:
      printHelp();
      exit(ExitCode.SUCCESS);
  }
  return null;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * CLI main function
 * Called from src/index.ts
 * Returns runtime if serve command started (for signal handlers)
 */
export async function main(): Promise<ServerRuntime | null> {
  try {
    // Get arguments (skip node/bun executable and script path)
    const argv = process.argv.slice(2);
    return await runCli(argv);
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : error);
    exit(ExitCode.RUNTIME_ERROR);
  }
}
