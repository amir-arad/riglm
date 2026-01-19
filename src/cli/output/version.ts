import { getPackageVersionInfo } from "../version.macro" with { type: "macro" };

export const { version, mcpSdkVersion } = getPackageVersionInfo();
export const runtime = typeof Bun !== "undefined" ? "Bun" : "Node.js";
export const runtimeVersion =
  typeof Bun !== "undefined" ? Bun.version : process.version.replace("v", "");

export function printVersion(json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          riglm: version,
          runtime,
          runtimeVersion,
          mcpSdk: mcpSdkVersion,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`riglm v${version}`);
    console.log(`Runtime: ${runtime} ${runtimeVersion}`);
    console.log(`MCP SDK: @modelcontextprotocol/sdk ${mcpSdkVersion}`);
  }
}
