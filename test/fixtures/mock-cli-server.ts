import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { makeMockServer } from "./mock-server";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

let server: Server | null = null;
let transport: StdioServerTransport | null = null;

async function cleanup() {
  try {
    if (transport) {
      await transport.close().catch(console.error);
      transport = null;
    }
    if (server) {
      await server.close().catch(console.error);
      server = null;
    }
    process.exit(0);
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

async function main() {
  const server = makeMockServer();

  transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  cleanup().catch(console.error);
});
