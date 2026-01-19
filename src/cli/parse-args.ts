import type {
  Command,
  ParsedArgs,
  ServeOptions,
  VersionOptions,
} from "./config/args.schema";

import { parseArgs as nodeParseArgs } from "util";

export function parseArgs(argv: string[]): ParsedArgs {
  const firstArg = argv[0];
  const commands: Command[] = ["serve", "version", "help"];

  let command: Command = "serve";
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

  switch (command) {
    case "serve":
      return parseServeArgs(argsToProcess);
    case "version":
      return parseVersionArgs(argsToProcess);
    case "help":
      return { command: "help", options: {}, positionals: [] };
    default:
      return { command: "serve", options: {}, positionals: [] };
  }
}

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
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

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
  };

  return { command: "serve", options, positionals };
}

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
