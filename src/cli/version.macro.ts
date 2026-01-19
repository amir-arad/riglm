import { readFileSync } from "fs";
import { join } from "path";

interface PackageVersionInfo {
  version: string;
  mcpSdkVersion: string;
}

export function getPackageVersionInfo(): PackageVersionInfo {
  const packagePath = join(import.meta.dir, "../../package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));

  const mcpDep = packageJson.dependencies?.["@modelcontextprotocol/sdk"];
  const mcpSdkVersion = mcpDep?.replace(/^[\^~]/, "") || "unknown";

  return {
    version: packageJson.version || "0.0.0",
    mcpSdkVersion,
  };
}
