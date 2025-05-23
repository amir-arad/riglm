import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";

/**
 * Private MCP Client (behind NAT/firewall)
 * Serves MCP tools through SOCKS proxy
 * This is actually an MCP Server that provides tools to the public MCP server
 */
export class PrivateMCPClient {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.httpServer = null;
    this.logEntries = [];
  }

  async start() {
    // Create MCP Server instance
    this.server = new Server(
      {
        name: "private-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register comprehensive tool set for testing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "ping",
            description: "Simple ping tool to test MCP connectivity",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Optional message to echo back",
                },
              },
            },
          },
          {
            name: "get_system_info",
            description: "Get comprehensive system information",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "calculate",
            description: "Perform mathematical calculations",
            inputSchema: {
              type: "object",
              properties: {
                expression: {
                  type: "string",
                  description: "Mathematical expression to evaluate",
                },
              },
              required: ["expression"],
            },
          },
          {
            name: "list_files",
            description: "List files in a directory",
            inputSchema: {
              type: "object",
              properties: {
                directory: {
                  type: "string",
                  description: "Directory path to list files from",
                  default: ".",
                },
              },
            },
          },
          {
            name: "read_file",
            description: "Read content from a file",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "File path to read",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "write_log",
            description: "Write an entry to the application log",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Log message to write",
                },
                level: {
                  type: "string",
                  description: "Log level (info, warn, error)",
                  enum: ["info", "warn", "error"],
                  default: "info",
                },
              },
              required: ["message"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.executeTool(name, args || {});
    });

    // Set up simple HTTP server that responds to MCP requests
    this.app.use(express.json());

    // Handle MCP requests via HTTP POST
    this.app.post("/mcp", async (req, res) => {
      try {
        // Handle the request based on method
        const { method, params } = req.body;
        let response;

        if (method === "tools/list") {
          response = await this.getToolsList();
        } else if (method === "tools/call") {
          const { name, arguments: args } = params;
          response = await this.executeTool(name, args || {});
        } else {
          throw new Error(`Unknown method: ${method}`);
        }

        res.json(response);
      } catch (error) {
        console.error("MCP request error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", name: "private-mcp-client" });
    });

    // Start HTTP server
    await new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(this.port, async (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Private MCP client listening on port ${this.port}`);

          // Wait longer and verify server is ready to accept requests
          try {
            await new Promise((r) => setTimeout(r, 50));
            await this.verifyServerReady();
            console.log(
              `Private MCP client verified ready on port ${this.port}`
            );
            resolve();
          } catch (error) {
            console.error("Private MCP client readiness check failed:", error);
            reject(error);
          }
        }
      });
    });

    // Don't connect transport for HTTP-only operation
    console.log("Private MCP client ready for HTTP requests");
  }

  async verifyServerReady() {
    // Simple verification that the server is bound and listening
    // We avoid self-fetch during startup as it can cause race conditions
    return new Promise((resolve, reject) => {
      const testSocket = net.createConnection(this.port, "localhost");

      testSocket.on("connect", () => {
        testSocket.destroy();
        resolve();
      });

      testSocket.on("error", (error) => {
        reject(new Error(`Server not ready: ${error.message}`));
      });

      // Timeout after 1 second
      setTimeout(() => {
        testSocket.destroy();
        reject(new Error("Server readiness check timeout"));
      }, 1000);
    });
  }

  async stop() {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          console.log("Private MCP client stopped");
          resolve();
        });
      });
    }
  }

  async getToolsList() {
    return {
      tools: [
        {
          name: "ping",
          description: "Simple ping tool to test MCP connectivity",
          inputSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Optional message to echo back",
              },
            },
          },
        },
        {
          name: "get_system_info",
          description: "Get comprehensive system information",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "calculate",
          description: "Perform mathematical calculations",
          inputSchema: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description: "Mathematical expression to evaluate",
              },
            },
            required: ["expression"],
          },
        },
        {
          name: "list_files",
          description: "List files in a directory",
          inputSchema: {
            type: "object",
            properties: {
              directory: {
                type: "string",
                description: "Directory path to list files from",
                default: ".",
              },
            },
          },
        },
        {
          name: "read_file",
          description: "Read content from a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path to read" },
            },
            required: ["path"],
          },
        },
        {
          name: "write_log",
          description: "Write an entry to the application log",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Log message to write" },
              level: {
                type: "string",
                description: "Log level",
                enum: ["info", "warn", "error"],
                default: "info",
              },
            },
            required: ["message"],
          },
        },
      ],
    };
  }

  async executeTool(name, args) {
    switch (name) {
      case "ping":
        return {
          content: [
            {
              type: "text",
              text: `Pong! ${
                args.message || "Hello from private client"
              } (timestamp: ${new Date().toISOString()})`,
            },
          ],
        };

      case "get_system_info":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  platform: os.platform(),
                  arch: os.arch(),
                  node_version: process.version,
                  uptime: os.uptime(),
                  memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                  },
                  cpu_count: os.cpus().length,
                  hostname: os.hostname(),
                },
                null,
                2
              ),
            },
          ],
        };

      case "calculate":
        try {
          const expression = args.expression;
          const result = this.evaluateExpression(expression);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  expression,
                  result,
                  calculated_at: new Date().toISOString(),
                }),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Calculation error: ${error.message}`);
        }

      case "list_files":
        try {
          const directory = args.directory || ".";
          const files = await fs.readdir(directory, { withFileTypes: true });
          const fileList = files.map((file) => ({
            name: file.name,
            type: file.isDirectory() ? "directory" : "file",
            path: path.join(directory, file.name),
          }));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  directory,
                  files: fileList,
                  count: fileList.length,
                }),
              },
            ],
          };
        } catch (error) {
          throw new Error(`File listing error: ${error.message}`);
        }

      case "read_file":
        try {
          const filePath = args.path;
          const content = await fs.readFile(filePath, "utf8");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  path: filePath,
                  content,
                  size: content.length,
                  read_at: new Date().toISOString(),
                }),
              },
            ],
          };
        } catch (error) {
          throw new Error(`File read error: ${error.message}`);
        }

      case "write_log":
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: args.level || "info",
          message: args.message,
        };
        this.logEntries.push(logEntry);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                logged: logEntry,
                total_entries: this.logEntries.length,
              }),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Safe mathematical expression evaluator
  evaluateExpression(expression) {
    // Only allow basic mathematical operations for security
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "");
    if (sanitized !== expression) {
      throw new Error("Invalid characters in expression");
    }

    // Use Function constructor for safe evaluation
    try {
      return Function('"use strict"; return (' + sanitized + ")")();
    } catch (error) {
      throw new Error("Invalid mathematical expression");
    }
  }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new PrivateMCPClient(8080);

  process.on("SIGINT", async () => {
    console.log("\nShutting down private MCP client...");
    await client.stop();
    process.exit(0);
  });

  try {
    await client.start();
  } catch (error) {
    console.error("Failed to start private MCP client:", error);
    process.exit(1);
  }
}
