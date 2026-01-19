

import { existsSync, mkdirSync, writeFileSync } from "fs";
import type { InitOptions, TemplateName } from "../config/args.schema";
import { getDefaultConfigLocation } from "../config/config-locator";
import { ExitCode, exit } from "../output/exit-codes";


import {
  MINIMAL_CONFIG,
  MINIMAL_EXTENSIONS,
  STANDARD_CONFIG,
  STANDARD_EXTENSIONS,
  FULL_CONFIG,
  FULL_EXTENSIONS,
} from "../templates";





interface Template {
  config: string;
  extensions: string;
}





const TEMPLATES: Record<TemplateName, Template> = {
  minimal: { config: MINIMAL_CONFIG, extensions: MINIMAL_EXTENSIONS },
  standard: { config: STANDARD_CONFIG, extensions: STANDARD_EXTENSIONS },
  full: { config: FULL_CONFIG, extensions: FULL_EXTENSIONS },
};






function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}


function writeFile(
  path: string,
  content: string,
  force: boolean
): { written: boolean; reason?: string } {
  if (existsSync(path) && !force) {
    return { written: false, reason: "File already exists" };
  }

  writeFileSync(path, content, "utf-8");
  return { written: true };
}






export async function initCommand(options: InitOptions): Promise<void> {
  const templateName: TemplateName = options.template ?? "minimal";
  const template = TEMPLATES[templateName];

  if (!template) {
    console.error(`Unknown template: ${templateName}`);
    console.error("Available templates: minimal, standard, full");
    exit(ExitCode.RUNTIME_ERROR);
  }

  
  const location = getDefaultConfigLocation(
    options.local ?? false,
    options.path
  );

  console.log(`Initializing Riglm configuration...`);
  console.log(`  Template:  ${templateName}`);
  console.log(`  Location:  ${location.directory}`);
  console.log("");

  
  try {
    ensureDirectory(location.directory);
  } catch (error) {
    console.error(`Failed to create directory: ${location.directory}`);
    console.error(error instanceof Error ? error.message : String(error));
    exit(ExitCode.RUNTIME_ERROR);
  }

  
  const configResult = writeFile(
    location.configPath,
    template.config,
    options.force ?? false
  );

  if (configResult.written) {
    console.log(`\u2713 Created: ${location.configPath}`);
  } else {
    console.log(`\u2717 Skipped: ${location.configPath} (${configResult.reason})`);
    if (!options.force) {
      console.log("  Use --force to overwrite existing files.");
    }
  }

  
  const extensionsResult = writeFile(
    location.extensionsPath,
    template.extensions,
    options.force ?? false
  );

  if (extensionsResult.written) {
    console.log(`\u2713 Created: ${location.extensionsPath}`);
  } else {
    console.log(`\u2717 Skipped: ${location.extensionsPath} (${extensionsResult.reason})`);
  }

  console.log("");

  
  if (configResult.written || extensionsResult.written) {
    console.log("Configuration initialized successfully!");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Edit the configuration file to add your MCP servers");
    console.log("  2. Run 'riglm validate' to verify the configuration");
    console.log("  3. Run 'riglm' to start the server");
  } else {
    console.log("No files were created. Use --force to overwrite existing files.");
  }

  exit(ExitCode.SUCCESS);
}
