
import type {
  InitOptions,
  ParsedArgs,
  ServeOptions,
  ValidateOptions,
  VersionOptions
} from "./config/args.schema";
import { ExitCode, exit } from "./output/exit-codes";

import { initCommand } from "./commands/init.command";
import { serveCommand, type ServerRuntime } from "./commands/serve.command";
import { validateCommand } from "./commands/validate.command";
import { versionCommand } from "./commands/version.command";
import { printHelp } from "./output/help";



export async function runCli(parsed: ParsedArgs): Promise<ServerRuntime | null> {
  switch (parsed.command) {
    case "serve": {
      const runtime = await serveCommand(parsed.options as ServeOptions);
      if (!runtime) {
        
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

