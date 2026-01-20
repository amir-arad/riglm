import { ClientTransportFactory, ServerTransportFactory } from "../ports/transport.port";
import { ConfigService, createConfigService } from "./config.service";
import {
  EmbeddedAssetsMap,
  createEmbeddedAssetsMiddleware,
  isStandaloneMode,
  loadEmbeddedAssets,
} from "../embedded-assets";
import { HostsService, createHostsServiceFactory } from "./hosts.service";
import {
  SessionBackendsFactory,
  createSessionBackendFactory,
} from "./backend.service";
import {
  errorHandler,
  notFoundHandler,
} from "../adapters/http/error.middleware";

import { CloseablePool } from "../etc/closeable";
import { ConfiguratorPort } from "../ports/config-storage.port";
import { LoggerPort } from "../ports/logger.port";
import { McpClientFactory } from "../ports/mcp-client.port";
import { McpServerFactory } from "../ports/mcp-server.port";
import { Server } from "http";
import express from "express";
import helmet from "helmet";
import { join } from "path";
import { makeHostsRoutes } from "../adapters/http/routes";
import { makeManagementRoutes } from "../adapters/http/management.routes";
import morgan from "morgan";

export interface ServerDeps {
  config: ConfiguratorPort;
  clientFactory: McpClientFactory;
  serverFactory: McpServerFactory;
  clientTransportFactory: ClientTransportFactory;
  serverTransportFactory: ServerTransportFactory;
  logger: LoggerPort;
  env: {
    port: number;
    host?: string;
    isProduction: boolean;
    enableUi?: boolean;
    enableApi?: boolean;
  };
}

export class RiglmServer {
  private httpServer: Server | null = null;
  port: number | null = null;
  private hostsServices: CloseablePool<HostsService>;
  private sessionBackends: SessionBackendsFactory;
  private configService: ConfigService;

  constructor(private deps: ServerDeps) {
    const {
      config,
      clientFactory,
      serverFactory,
      clientTransportFactory,
      logger,
    } = this.deps;

    this.sessionBackends = createSessionBackendFactory({
      clientFactory,
      transportFactory: clientTransportFactory,
      config,
      logger,
    });

    this.hostsServices = createHostsServiceFactory({
      serverFactory,
      config,
      logger,
      sessionBackends: this.sessionBackends,
    });

    this.configService = createConfigService({
      config,
      logger,
    });
  }

  async start() {
    const {
      serverTransportFactory,
      logger,
      env,
    } = this.deps;


    const app = express();

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        },
      }),
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      morgan("combined", {
        stream: {
          write: (message: string) => {
            logger.info(message.trim());
          },
        },
      }),
    );

    const enableUi = env.enableUi ?? true;
    const enableApi = env.enableApi ?? true;

    if (enableUi) {
      const standalone = isStandaloneMode();
      if (standalone) {
        const embeddedAssets: EmbeddedAssetsMap = await loadEmbeddedAssets();
        logger.info("Running in standalone mode with embedded assets", {
          assetCount: embeddedAssets.size,
        });
        app.use(
          createEmbeddedAssetsMiddleware(
            embeddedAssets,
          ) as express.RequestHandler,
        );
      } else {
        const clientPath = join(__dirname, "../../public");
        logger.debug("Serving static files from filesystem", { clientPath });
        app.use(express.static(clientPath));
      }
    } else {
      logger.info("Web UI disabled");
    }

    if (enableApi) {
      app.use("/api", makeManagementRoutes(this.configService, this.hostsServices, logger));
    } else {
      logger.info("Management API disabled");
    }

    app.use(
      makeHostsRoutes(this.hostsServices, serverTransportFactory, logger),
    );
    app.use(notFoundHandler);
    app.use(errorHandler(env.isProduction, logger));

    this.port = await new Promise<number>((resolve, reject) => {
      const { port, host = "0.0.0.0" } = env;
      this.httpServer = app.listen(port, host, () => {
        const displayHost = host === "0.0.0.0" ? "localhost" : host;
        logger.info(`Server running on http://${displayHost}:${port}`);
        resolve(port);
      });
      this.httpServer.on("error", (err) => {
        logger.error("Error starting server", { error: err });
        reject(err);
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
