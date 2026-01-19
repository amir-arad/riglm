

import { ExitCode, exit } from "../output/exit-codes";

import type { VersionOptions } from "../config/args.schema";


import { getPackageVersionInfo } from "../version.macro" with { type: "macro" };





interface VersionInfo {
  version: string;
  runtime: string;
  runtimeVersion: string;
  mcpSdk: string;
}






const EMBEDDED_VERSION_INFO = getPackageVersionInfo();


function getPackageVersion(): string {
  return EMBEDDED_VERSION_INFO.version;
}


function getMcpSdkVersion(): string {
  return EMBEDDED_VERSION_INFO.mcpSdkVersion;
}


function detectRuntime(): { name: string; version: string } {
  
  if (typeof Bun !== "undefined") {
    return { name: "Bun", version: Bun.version };
  }
  
  return { name: "Node.js", version: process.version.replace("v", "") };
}

function getVersionInfo(): VersionInfo {
  const runtime = detectRuntime();
  return {
    version: getPackageVersion(),
    runtime: runtime.name,
    runtimeVersion: runtime.version,
    mcpSdk: getMcpSdkVersion(),
  };
}

export async function versionCommand(options: VersionOptions): Promise<void> {
  const info = getVersionInfo();

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          riglm: info.version,
          runtime: info.runtime,
          runtimeVersion: info.runtimeVersion,
          mcpSdk: info.mcpSdk,
        },
        null,
        2
      )
    );
  } else {
    console.log(`riglm v${info.version}`);
    console.log(`Runtime: ${info.runtime} ${info.runtimeVersion}`);
    console.log(`MCP SDK: @modelcontextprotocol/sdk ${info.mcpSdk}`);
  }

  exit(ExitCode.SUCCESS);
}

export function getVersion(): string {
  return getPackageVersion();
}
