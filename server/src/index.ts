import cors from "cors";
import express, { Router, json } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { handleRpc } from "typed-rpc/server";
import { entitiesRoutes } from "./entities/entity.controller";
import { close, init } from "./entities/entity.model";
import { env } from "./etc/env";
import { errorHandler, notFoundHandler } from "./etc/error.middleware";
import { logger, morganStream } from "./etc/logger";
import { endpointsRoutes } from "./sse-endpoint/controller";
import { endpointServices } from "./sse-endpoint/endpoint.service";
import { SseServerActions, sseServerActions } from "./sse-server";

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
app.use("/api/apps", entitiesRoutes);
app.use(endpointsRoutes);

export const rpcRoutes = Router();
rpcRoutes.use(json());
rpcRoutes.post("/", (req, res, next) => {
  handleRpc<SseServerActions>(req.body, sseServerActions)
    .then((result) => res.json(result))
    .catch(next);
});

app.use("/rpc", rpcRoutes);
// Handle 404 errors
app.use(notFoundHandler);
// Handle errors
app.use(errorHandler);
init();
const httpServer = app.listen(env.port, "0.0.0.0", () => {
  logger.info(`Server running on http://localhost:${env.port}`);
});

process.on("SIGINT", async () => {
  logger.info("Received SIGINT signal, cleaning up...");
  cleanup(0);
});
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM signal, cleaning up...");
  cleanup(0);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection", { error });
  cleanup(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  cleanup(1);
});

async function cleanup(errorCode = 0) {
  close();
  await new Promise((resolve) => {
    httpServer.close(() => {
      logger.info("HTTP server closed");
      resolve(true);
    });
  });
  await endpointServices.close();
  if (errorCode) {
    logger.error("Server exited with error code", { errorCode });
  }
  process.exit(errorCode);
}
