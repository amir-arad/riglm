import { clientTransportFactory, createServerTransportAdapter } from "../adapters/mcp/transports/transport-factory.adapter";

import { RiglmServer } from "./riglm-server";
import { createFileConfigAdapter } from "../adapters/storage/file-config.adapter";
import { createMcpClientAdapter } from "../adapters/mcp/mcp-client.adapter";
import { createMcpServerAdapter } from "../adapters/mcp/mcp-server.adapter";
import { createWinstonLoggerAdapter } from "../adapters/logging/winston.adapter";
import { env } from "../etc/env";

export interface ServerRuntime {
  close: () => Promise<void>;
}
interface BootstrapConfig {
  port: number;
  host: string;
  configPath: string;
  logLevel: "debug" | "info" | "warn" | "error" | "silent";
  logFormat: "pretty" | "json";
  logFile: string | undefined;
  enableUi: boolean;
  enableApi: boolean;
  quiet: boolean;
}
export async function bootstrap(
  config: BootstrapConfig,
): Promise<ServerRuntime> {
  const logger = createWinstonLoggerAdapter({
    logLevel: config.logLevel,
    isProduction: env.isProduction,
    logFormat: config.logFormat,
    logFile: config.logFile,
  });

  const configAdapter = createFileConfigAdapter(config.configPath!, logger);

  try {
    configAdapter.load();
  } catch (error) {
    logger.error("Failed to load configuration", { error });
    throw error;
  }

  const server = new RiglmServer({
    config: configAdapter,
    clientFactory: createMcpClientAdapter,
    serverFactory: createMcpServerAdapter,
    clientTransportFactory: clientTransportFactory,
    serverTransportFactory: createServerTransportAdapter,
    logger: logger.child({ service: "riglm" }),
    env: {
      port: config.port,
      host: config.host,
      isProduction: env.isProduction,
      enableUi: config.enableUi,
      enableApi: config.enableApi,
    },
  });

  await server.start();

  return {
    close: async () => {
      logger.info("Shutting down server...");
      await server.close();
    },
  };
}
