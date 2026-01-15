/**
 * AbcServer - Express server with MCP aggregation
 */

import express from "express";
import helmet from "helmet";
import { Server } from "http";
import morgan from "morgan";
import { ConfiguratorPort } from "./ports/config-storage.port";
import { LoggerPort } from "./ports/logger.port";
import { McpClientFactory } from "./ports/mcp-client.port";
import { McpServerFactory } from "./ports/mcp-server.port";
import { ClientTransportFactory } from "./ports/transport.port";
import { Config } from "./domain/types";
import { errorHandler, notFoundHandler } from "./adapters/http/error.middleware";
import { Services } from "./etc/service";
import { makeHostsRoutes } from "./adapters/http/routes";
import {
  createSessionBackendFactory,
  SessionBackendsFactory,
} from "./application/backend.service";
import {
  createHostsServiceFactory,
  HostsService,
} from "./application/hosts.service";

// ============================================================================
// Types
// ============================================================================

/**
 * Interface for configuration access (legacy compatibility)
 */
export interface ServerConfigurator {
  get(): Config;
}

/**
 * Server dependencies using ports
 */
export interface ServerDeps {
  config: ConfiguratorPort;
  clientFactory: McpClientFactory;
  serverFactory: McpServerFactory;
  transportFactory: ClientTransportFactory;
  logger: LoggerPort;
  env: {
    port: number;
    isProduction: boolean;
  };
}

/**
 * Legacy server options (for backward compatibility)
 */
export interface ServerOptions {
  config: ServerConfigurator;
  env: {
    port: number;
    isProduction: boolean;
  };
  logger: LoggerPort;
}

// ============================================================================
// Server Class
// ============================================================================

export class AbcServer {
  private httpServer: Server | null = null;
  port: number | null = null;
  private hostsServices: Services<HostsService> | null = null;
  private sessionBackends: SessionBackendsFactory | null = null;

  constructor(private deps: ServerDeps) {}

  async start() {
    const { config, clientFactory, serverFactory, transportFactory, logger, env } = this.deps;

    // Create session backends factory
    this.sessionBackends = createSessionBackendFactory({
      clientFactory,
      transportFactory,
      config,
      logger,
    });

    // Create hosts services factory
    this.hostsServices = createHostsServiceFactory({
      serverFactory,
      config,
      logger,
      sessionBackends: this.sessionBackends,
    });

    // Set up Express app
    const app = express();
    app.use(helmet());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      morgan("combined", {
        stream: {
          write: (message: string) => {
            logger.info(message.trim());
          },
        },
      })
    );
    app.use(makeHostsRoutes(this.hostsServices, logger));
    app.use(notFoundHandler);
    app.use(errorHandler(env.isProduction, logger));

    // Start HTTP server
    this.port = await new Promise<number>((resolve, reject) => {
      const { port } = env;
      this.httpServer = app.listen(port, (err) => {
        if (err) {
          logger.error("Error starting server", { error: err });
          return reject(err);
        }
        logger.info(`Server running on http://localhost:${port}`);
        resolve(port);
      });
    });
  }

  async close() {
    const { logger } = this.deps;

    await new Promise((resolve) => {
      if (!this.httpServer) {
        logger.warn("HTTP server is not running");
        return resolve(true);
      }

      this.httpServer.close(() => {
        logger.info("HTTP server closed");
        resolve(true);
      });
    });

    if (!this.hostsServices) {
      logger.warn("Endpoint services are not running");
      return;
    }
    await this.hostsServices.close();
  }
}
