import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import JSON5 from "json5";
import * as readline from "readline";

import type {
  ParsedArgs,
  ServeOptions,
  VersionOptions,
} from "./config/args.schema";
import {
  getDefaultConfigLocation,
  type ConfigLocation,
} from "./config/config-locator";
import { resolveConfig, ResolvedConfig } from "./config/resolved-config";
import { ValidatedConfigSchema, type Config } from "../domain/config-resolver";
import { printBanner, printQuietBanner } from "./output/banner";
import { ExitCode, exit } from "./output/exit-codes";
import { printHelp } from "./output/help";
import { printVersion, version } from "./output/version";
import { bootstrap, type ServerRuntime } from "../application/bootstrap";

export type { ServerRuntime } from "../application/bootstrap";

const MINIMAL_CONFIG = `{
  // Riglm Configuration
  // See: https://github.com/your-org/riglm

  // MCP servers to connect to
  "servers": {
    // Add your MCP servers here
    // "example": {
    //   "command": "npx",
    //   "args": ["-y", "@modelcontextprotocol/server-example"]
    // }
  },

  // Endpoints that aggregate servers
  "endpoints": {
    // Add your endpoints here
    // "main": {
    //   "servers": ["example"],
    //   "description": "Main endpoint"
    // }
  }
}
`;

const MINIMAL_EXTENSIONS = `{
  "extensions": []
}
`;

function loadConfigFile(configPath: string): Config | null {
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const rawConfig = JSON5.parse(content);

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
    console.error(
      `Failed to load config: ${error instanceof Error ? error.message : error}`,
    );
    return null;
  }
}

async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

async function promptChoice(
  question: string,
  choices: string[],
): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(question);
  choices.forEach((choice, i) => {
    console.log(`  ${i + 1}. ${choice}`);
  });

  return new Promise((resolve) => {
    rl.question(`Choose [1-${choices.length}]: `, (answer) => {
      rl.close();
      const num = parseInt(answer, 10);
      if (num >= 1 && num <= choices.length) {
        resolve(num - 1);
      } else {
        resolve(0);
      }
    });
  });
}

function createConfig(location: ConfigLocation): boolean {
  try {
    if (!existsSync(location.directory)) {
      mkdirSync(location.directory, { recursive: true });
    }

    writeFileSync(location.configPath, MINIMAL_CONFIG, "utf-8");
    writeFileSync(location.extensionsPath, MINIMAL_EXTENSIONS, "utf-8");

    console.log("");
    console.log(`Created: ${location.configPath}`);
    console.log(`Created: ${location.extensionsPath}`);
    console.log("");

    return true;
  } catch (error) {
    console.error(
      `Failed to create config: ${error instanceof Error ? error.message : error}`,
    );
    return false;
  }
}

export async function runCli(
  parsed: ParsedArgs,
): Promise<ServerRuntime | null> {
  switch (parsed.command) {
    case "version":
      printVersion((parsed.options as VersionOptions).json ?? false);
      exit(ExitCode.SUCCESS);

    case "help":
    default:
      printHelp();
      exit(ExitCode.SUCCESS);

    case "serve": {
      const config = resolveConfig(parsed.options as ServeOptions);

      if (!config.configPath) {
        if (config.quiet) {
          exit(ExitCode.CONFIG_NOT_FOUND);
        }

        console.log("No configuration file found.");
        console.log("");
        console.log("Searched locations:");
        console.log("  1. ./.riglm/config.json5");
        console.log("  2. ~/.config/riglm/config.json5");
        console.log("");

        const shouldInit = await promptYesNo(
          "Would you like to create a configuration file?",
        );

        if (!shouldInit) {
          console.log("");
          console.log("Run with -c <path> to specify a configuration file.");
          exit(ExitCode.CONFIG_NOT_FOUND);
        }

        const choice = await promptChoice(
          "Where would you like to create it?",
          ["./.riglm/ (project scope)", "~/.config/riglm/ (user scope)"],
        );

        const location = getDefaultConfigLocation(choice === 0);

        if (!createConfig(location)) {
          exit(ExitCode.RUNTIME_ERROR);
        }

        config.configPath = location.configPath;
      }

      const appConfig = loadConfigFile(config.configPath);
      if (!appConfig) {
        console.error(
          `Failed to load configuration from: ${config.configPath}`,
        );
        exit(ExitCode.INVALID_CONFIG);
      }

      if (config.quiet) {
        printQuietBanner(config);
      } else {
        printBanner({ version, config, appConfig });
      }

      try {
        return await bootstrap(config as ResolvedConfig & { configPath: string });
      } catch (error) {
        console.error(
          "Failed to start server:",
          error instanceof Error ? error.message : error,
        );
        exit(ExitCode.RUNTIME_ERROR);
      }
    }
  }

  return null;
}
