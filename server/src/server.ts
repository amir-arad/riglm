import cors from "cors";
import express, { Router, json } from "express";
import helmet from "helmet";
import { Server } from "http";
import morgan from "morgan";
import { handleRpc } from "typed-rpc/server";
import { Config } from "./etc/config-schema";
import { env } from "./etc/env";
import { errorHandler, notFoundHandler } from "./etc/error.middleware";
import { logger, morganStream } from "./etc/logger";
import { Services } from "./etc/service";
import { makeHostsRoutes } from "./host-gateway/controller";
import {
  HostsService,
  makeHostsServiceFactory,
} from "./host-gateway/hosts.service";
import {
  makeSessionBackendFactory,
  sseServerActions,
  SseServerActions,
} from "./backend.service";

export interface ServerConfigurator {
  get(): Config;
}

export class AbcServer {
  private httpServer: Server | null = null;
  port: number | null = null;
  private hostsServices: Services<HostsService> | null = null;
  constructor(private config: ServerConfigurator) {}
  async start() {
    const sessionBackends = makeSessionBackendFactory(this.config);
    this.hostsServices = makeHostsServiceFactory(sessionBackends, this.config);
    const app = express();
    app.use(helmet());
    app.use(
      cors({
        origin: env.cors.origin,
        credentials: true,
      })
    );
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan("combined", { stream: morganStream }));
    app.use(express.static(env.clientBuildPath));
    app.use(makeHostsRoutes(this.hostsServices));

    const rpcRoutes = Router();
    rpcRoutes.use(json());
    rpcRoutes.post("/", (req, res, next) => {
      handleRpc<SseServerActions>(req.body, sseServerActions(this.config))
        .then((result) => res.json(result))
        .catch(next);
    });

    app.use("/rpc", rpcRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);

    this.port = await new Promise<number>((resolve, reject) => {
      this.httpServer = app.listen(env.port, (err) => {
        if (err) {
          logger.error("Error starting server", { error: err });
          return reject(err);
        }
        logger.info(`Server running on http://localhost:${env.port}`);
        resolve(env.port);
      });
    });
  }

  async close() {
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
