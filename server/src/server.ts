import express, { json, Router } from "express";
import helmet from "helmet";
import { Server } from "http";
import morgan from "morgan";
import { handleRpc } from "typed-rpc/server";
import { Logger } from "winston";
import {
  makeSessionBackendFactory,
  sseServerActions,
  SseServerActions,
} from "./backend.service";
import { Config } from "./etc/config-schema";
import { errorHandler, notFoundHandler } from "./etc/error.middleware";
import { Services } from "./etc/service";
import { makeHostsRoutes } from "./host-gateway/controller";
import {
  HostsService,
  makeHostsServiceFactory,
} from "./host-gateway/hosts.service";

export interface ServerConfigurator {
  get(): Config;
}
export interface ServerOptons {
  config: ServerConfigurator;
  env: {
    port: number;
    isProduction: boolean;
  };
  logger: Logger;
}

export class AbcServer {
  private httpServer: Server | null = null;
  port: number | null = null;
  private hostsServices: Services<HostsService> | null = null;
  constructor(private opts: ServerOptons) {}
  async start() {
    const sessionBackends = makeSessionBackendFactory(this.opts.config);
    this.hostsServices = makeHostsServiceFactory(
      sessionBackends,
      this.opts.config
    );
    const app = express();
    app.use(helmet());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      morgan("combined", {
        stream: {
          write: (message: string) => {
            this.opts.logger.info(message.trim());
          },
        },
      })
    );
    app.use(makeHostsRoutes(this.hostsServices));

    const rpcRoutes = Router();
    rpcRoutes.use(json());
    rpcRoutes.post("/", (req, res, next) => {
      handleRpc<SseServerActions>(req.body, sseServerActions(this.opts.config))
        .then((result) => res.json(result))
        .catch(next);
    });

    app.use("/rpc", rpcRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler(this.opts.env.isProduction));

    this.port = await new Promise<number>((resolve, reject) => {
      const { port } = this.opts.env;
      this.httpServer = app.listen(port, (err) => {
        if (err) {
          this.opts.logger.error("Error starting server", { error: err });
          return reject(err);
        }
        this.opts.logger.info(`Server running on http://localhost:${port}`);
        resolve(port);
      });
    });
  }

  async close() {
    await new Promise((resolve) => {
      if (!this.httpServer) {
        this.opts.logger.warn("HTTP server is not running");
        return resolve(true);
      }

      this.httpServer.close(() => {
        this.opts.logger.info("HTTP server closed");
        resolve(true);
      });
    });
    if (!this.hostsServices) {
      this.opts.logger.warn("Endpoint services are not running");
      return;
    }
    await this.hostsServices.close();
  }
}
