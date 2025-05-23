import { createRequire } from "module";
const require = createRequire(import.meta.url);
const socks = require("socksv5");

/**
 * Simple SOCKS5 proxy server for MCP MVP
 * This server allows the public MCP server to connect to the private MCP client
 */
export class SOCKSServer {
  constructor(port = 1080) {
    this.port = port;
    this.server = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      // Create SOCKS5 server with no authentication
      this.server = socks.createServer((info, accept, deny) => {
        // Accept all connections for MVP
        accept();
      });

      this.server.listen(this.port, "0.0.0.0", (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`SOCKS5 server listening on port ${this.port}`);
          // Give extra time for SOCKS server to be ready
          setTimeout(() => {
            console.log(`SOCKS5 server verified ready on port ${this.port}`);
            resolve();
          }, 100);
        }
      });

      this.server.on("error", (err) => {
        console.error("SOCKS server error:", err);
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log("SOCKS5 server stopped");
          resolve();
        });
      });
    }
  }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SOCKSServer(1080);

  process.on("SIGINT", async () => {
    console.log("\nShutting down SOCKS server...");
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error("Failed to start SOCKS server:", error);
    process.exit(1);
  }
}
