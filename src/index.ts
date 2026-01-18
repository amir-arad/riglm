/**
 * Entry Point - CLI for Riglm
 *
 * Routes to CLI commands: serve (default), validate, init, version
 * Handles process signals for graceful shutdown.
 */

import { main } from "./cli";
import { ExitCode } from "./cli/output/exit-codes";
import type { ServerRuntime } from "./cli/commands/serve.command";

let runtime: ServerRuntime | null = null;

/**
 * Graceful shutdown handler
 */
async function shutdown(exitCode: ExitCode): Promise<never> {
  if (runtime) {
    try {
      await runtime.close();
    } catch (error) {
      console.error("Error during shutdown:", error);
    }
  }
  process.exit(exitCode);
}

// Signal handlers
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT signal, cleaning up...");
  shutdown(ExitCode.SUCCESS);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM signal, cleaning up...");
  shutdown(ExitCode.SUCCESS);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  shutdown(ExitCode.RUNTIME_ERROR);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown(ExitCode.RUNTIME_ERROR);
});

// Run CLI
main()
  .then((r) => {
    runtime = r;
  })
  .catch((error) => {
    console.error("Fatal error:", error instanceof Error ? error.message : error);
    process.exit(ExitCode.RUNTIME_ERROR);
  });
