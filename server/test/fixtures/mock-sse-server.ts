import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { Server } from "http";
import morgan from "morgan";
import winston from "winston";
import { makeMockServer } from "./mock-server";
import { setTimeout } from "node:timers/promises";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.label({ label: "mock-mcp-backend", message: true }),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
export function mocSseServer() {
  const server = makeMockServer();

  const app = express();
  app.use(express.json());
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => {
          logger.debug(message.trim());
        },
      },
    })
  );
  const transports = {
    sse: {} as Record<string, SSEServerTransport>,
  };
  app.get("/sse", async (_, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.sse[transport.sessionId] = transport;
    transport.onclose = () => {
      logger.debug("transport closed");
      res.end();
    };
    res.on("close", () => {
      delete transports.sse[transport.sessionId];
    });
    await server.connect(transport).catch((err) => {
      logger.error("Error connecting server:", err);
      res.status(500).send("Error connecting server");
    });
  });
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.sse[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).send("No transport found for sessionId");
    }
  });
  let httpServer: Server | null = null;
  const listen = (port: number) =>
    new Promise<void>((resolve, reject) => {
      logger.debug(`connecting to port ${port}`);
      httpServer = app.listen(port, (err) => {
        if (err) {
          logger.error("Error starting", err);
          return reject(err);
        }
        logger.info(`listening on port ${port}`);
        resolve();
      });
    });
  const close = async () => {
    logger.debug(`closing`);
    const closeP = new Promise((resolve) => {
      httpServer?.on("close", resolve);
    });
    httpServer?.close();
    httpServer = null;
    await closeP;
    logger.info(`closed httpServer`);
    await Promise.all(Object.values(transports.sse).map((t) => t.close()));
    logger.debug(`closed transports`);
    await server.close();
    logger.info(`closed mcpServer`);
  };
  logger.debug(`built`);
  return { listen, close };
}
