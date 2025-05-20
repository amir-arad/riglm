import { ConfigManager } from "./config-manager";
import { env } from "./etc/env";
import { makeDefaultLogger } from "./etc/logger";
import { AbcServer } from "./server";

const config = new ConfigManager(env.configPath);
const logger = makeDefaultLogger(env);

async function main() {
  config.load();
  const server = new AbcServer({
    config,
    env,
    logger: logger.child({ service: "ghostwheels" }),
  });
  server.start().catch((error) => {
    logger.error("Failed to start server", { error });
    close(1);
  });

  process.on("SIGINT", async () => {
    logger.info("Received SIGINT signal, cleaning up...");
    server.close().then(() => close(0));
  });
  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM signal, cleaning up...");
    server.close().then(() => close(0));
  });
  process.on("unhandledRejection", (error) => {
    logger.error("Unhandled rejection", { error });
    server.close().then(() => close(1));
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error });
    server.close().then(() => close(1));
  });

  async function close(errorCode = 0) {
    if (errorCode) {
      logger.error("Server exited with error code", { errorCode });
    }
    process.exit(errorCode);
  }
}
main().catch((error) => {
  console.error("Failed to initialize server", error);
  logger.error("Failed to load configuration. Exiting.");
  process.exit(1);
});
