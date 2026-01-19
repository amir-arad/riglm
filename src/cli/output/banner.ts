

import type { Config } from "../../domain/config-resolver";
import type { ResolvedConfig } from "../config/resolved-config";





const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[97m",
  dim: "\x1b[2m",
};





export interface BannerInfo {
  version: string;
  config: ResolvedConfig;
  appConfig: Config | null;
}





const BOX = {
  topLeft: "\u256D",     
  topRight: "\u256E",    
  bottomLeft: "\u2570",  
  bottomRight: "\u256F", 
  horizontal: "\u2500",  
  vertical: "\u2502",    
};


function createBox(lines: string[], width: number): string[] {
  const output: string[] = [];
  const innerWidth = width - 2;

  
  output.push(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight);

  
  for (const line of lines) {
    const padding = innerWidth - line.length;
    output.push(BOX.vertical + "  " + line + " ".repeat(Math.max(0, padding - 2)) + BOX.vertical);
  }

  
  output.push(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight);

  return output;
}






export function printBanner(info: BannerInfo): void {
  const { version, config, appConfig } = info;

  
  console.log();
  console.log(`    ${C.white}{${C.cyan}Ξ${C.white}}${C.reset}`);
  console.log(`   ${C.bold}RigLM${C.reset}`);

  
  const headerLines = [
    "The Intelligent Context Router",
    `v${version}`,
  ];
  const box = createBox(headerLines, 50);
  console.log(box.join("\n"));
  console.log();

  
  if (config.configPath) {
    console.log(`  Config:     ${config.configPath}`);
  } else {
    console.log("  Config:     (no configuration file found)");
  }

  
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


export function printQuietBanner(config: ResolvedConfig): void {
  const baseUrl = config.host === "0.0.0.0" ? "localhost" : config.host;
  console.log(`RigLM listening on http://${baseUrl}:${config.port}`);
}


export function printDryRun(info: BannerInfo): void {
  const { version, config, appConfig } = info;

  console.log(`RigLM v${version} - Dry Run`);
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
