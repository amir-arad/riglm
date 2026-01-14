/**
 * Entry Point - Wires all adapters and starts the server
 */

import { env } from "./etc/env";
import { AbcServer } from "./server";

// Adapters
import { createWinstonLoggerAdapter } from "./adapters/logging/winston.adapter";
import { createFileConfigAdapter } from "./adapters/storage/file-config.adapter";
import { McpClientFactoryAdapter } from "./adapters/mcp/mcp-client.adapter";
import { McpServerFactoryAdapter } from "./adapters/mcp/mcp-server.adapter";
import { ClientTransportFactoryAdapter } from "./adapters/mcp/transports";

async function main() {
  // Create logger adapter
  const logger = createWinstonLoggerAdapter({
    logLevel: env.logLevel,
    isProduction: env.isProduction,
  });

  // Create config adapter and load configuration
  const config = createFileConfigAdapter(env.configPath, logger);
  config.load();

  // Create MCP adapters
  const clientFactory = new McpClientFactoryAdapter();
  const serverFactory = new McpServerFactoryAdapter();
  const transportFactory = new ClientTransportFactoryAdapter();

  // Create and start server with all dependencies
  const server = new AbcServer({
    config,
    clientFactory,
    serverFactory,
    transportFactory,
    logger: logger.child({ service: "ghostwheels" }),
    env: {
      port: env.port,
      isProduction: env.isProduction,
    },
  });

  server.start().catch((error) => {
    logger.error("Failed to start server", { error });
    close(1);
  });

  // Signal handlers
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

  function close(errorCode = 0) {
    if (errorCode) {
      logger.error("Server exited with error code", { errorCode });
    }
    process.exit(errorCode);
  }
}

main().catch((error) => {
  console.error("Failed to initialize server", error);
  process.exit(1);
});
