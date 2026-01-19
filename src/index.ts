import { ExitCode } from "./cli/output/exit-codes";
import { parseArgs } from "./cli/parse-args";
import { runCli, type ServerRuntime } from "./cli";

let runtime: ServerRuntime | null = null;

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

runCli(parseArgs(process.argv.slice(2)))
  .then((r) => {
    runtime = r;
  })
  .catch((error) => {
    console.error(
      "Fatal error:",
      error instanceof Error ? error.message : error,
    );
    process.exit(ExitCode.RUNTIME_ERROR);
  });
