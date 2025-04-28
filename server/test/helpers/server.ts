import { Server } from "http";
import express from "express";
import { join } from "path";
import { loadConfig } from "../../src/config";
import { env } from "../../src/etc/env";
import { endpointsRoutes } from "../../src/sse-endpoint/controller";
import { AddressInfo } from "net";

let server: Server;

export async function startServer(configPath: string): Promise<string> {
  // Override the config path in env
  env.mvpConfigPath = configPath;

  // Load configuration
  loadConfig();

  // Create a minimal app for testing
  const app = express();
  app.use(endpointsRoutes);

  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve(`http://localhost:${port}`);
    });
  });
}

export async function stopServer(): Promise<void> {
  if (!server) return;

  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}
