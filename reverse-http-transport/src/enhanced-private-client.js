import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Enhanced Private MCP Client (behind NAT/firewall)
 * Comprehensive MCP tool provider with enhanced features
 * Serves 6 specific tools through SOCKS proxy with detailed implementations
 */
export class EnhancedPrivateMCPClient {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.httpServer = null;
    this.logEntries = [];
    this.startTime = Date.now();
    this.requestCount = 0;

    // Enhanced client metadata
    this.metadata = {
      name: "enhanced-private-mcp-client",
      version: "2.0.0",
      description: "Enhanced MCP client with comprehensive tool suite",
      capabilities: [
        "system_info",
        "calculations",
        "file_operations",
        "logging",
        "connectivity",
      ],
      toolCount: 6,
    };
  }

  async start() {
    // Create Enhanced MCP Server instance
    this.server = new Server(
      {
        name: this.metadata.name,
        version: this.metadata.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register enhanced tool set
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Note: requestCount is incremented in the HTTP handler
      const { name, arguments: args } = request.params;
      return await this.executeTool(name, args || {});
    });

    // Set up enhanced HTTP server
    this.app.use(express.json());
    this.app.use(this.loggingMiddleware.bind(this));

    // Handle MCP requests via HTTP POST
    this.app.post("/mcp", async (req, res) => {
      try {
        this.requestCount++; // Increment request count for all MCP requests
        const { method, params } = req.body;
        let response;

        if (method === "tools/list") {
          response = await this.getEnhancedToolsList();
        } else if (method === "tools/call") {
          const { name, arguments: args } = params;
          response = await this.executeTool(name, args || {});
        } else {
          throw new Error(`Unknown method: ${method}`);
        }

        res.json(response);
      } catch (error) {
        console.error("Enhanced MCP request error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Enhanced health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        name: this.metadata.name,
        version: this.metadata.version,
        uptime: Date.now() - this.startTime,
        requestCount: this.requestCount,
        toolsAvailable: this.metadata.toolCount,
        capabilities: this.metadata.capabilities,
      });
    });

    // Enhanced status endpoint
    this.app.get("/status", (req, res) => {
      res.json({
        ...this.metadata,
        runtime: {
          uptime: Date.now() - this.startTime,
          requestCount: this.requestCount,
          logEntries: this.logEntries.length,
          memoryUsage: process.memoryUsage(),
          platform: os.platform(),
          arch: os.arch(),
        },
      });
    });

    // Start HTTP server
    await new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(
            `Enhanced Private MCP client listening on port ${this.port}`
          );
          resolve();
        }
      });
    });

    // Small delay to ensure server is fully ready to accept connections
    await new Promise((resolve) => setTimeout(resolve, 10));

    console.log("Enhanced Private MCP client ready for HTTP requests");
    console.log(`Available tools: ${this.metadata.toolCount}`);
    console.log(`Capabilities: ${this.metadata.capabilities.join(", ")}`);
  }

  async stop() {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          console.log("Enhanced Private MCP client stopped");
          resolve();
        });
      });
    }
  }

  // Enhanced logging middleware
  loggingMiddleware(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path} - ${
          res.statusCode
        } (${duration}ms)`
      );
    });
    next();
  }

  getToolDefinitions() {
    return [
      {
        name: "get_system_info",
        description:
          "Get comprehensive system information including platform, architecture, Node.js version, memory, and CPU details",
        inputSchema: {
          type: "object",
          properties: {
            includeProcessInfo: {
              type: "boolean",
              description: "Include detailed process information",
              default: false,
            },
          },
        },
      },
      {
        name: "calculate",
        description:
          "Safely evaluate mathematical expressions with enhanced error handling and operation tracking",
        inputSchema: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description:
                "Mathematical expression to evaluate (supports +, -, *, /, (), numbers)",
            },
            precision: {
              type: "number",
              description: "Number of decimal places for the result",
              default: 10,
            },
          },
          required: ["expression"],
        },
      },
      {
        name: "list_files",
        description:
          "List files and directories with enhanced type information and metadata",
        inputSchema: {
          type: "object",
          properties: {
            directory: {
              type: "string",
              description: "Directory path to list files from",
              default: ".",
            },
            includeHidden: {
              type: "boolean",
              description: "Include hidden files and directories",
              default: false,
            },
            recursive: {
              type: "boolean",
              description: "Recursively list subdirectories",
              default: false,
            },
          },
        },
      },
      {
        name: "read_file",
        description:
          "Read file content with comprehensive metadata including size, encoding, and timestamps",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "File path to read",
            },
            encoding: {
              type: "string",
              description: "File encoding",
              default: "utf8",
            },
            maxSize: {
              type: "number",
              description: "Maximum file size to read in bytes",
              default: 1048576,
            },
          },
          required: ["path"],
        },
      },
      {
        name: "write_log",
        description:
          "Write structured log entries with enhanced metadata and filtering capabilities",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Log message to write",
            },
            level: {
              type: "string",
              description: "Log level (debug, info, warn, error)",
              enum: ["debug", "info", "warn", "error"],
              default: "info",
            },
            category: {
              type: "string",
              description: "Log category for organization",
              default: "general",
            },
            metadata: {
              type: "object",
              description: "Additional metadata to include with the log entry",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "ping",
        description:
          "Enhanced connectivity testing with detailed response metrics and customizable behavior",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Custom message to echo back",
            },
            includeMetrics: {
              type: "boolean",
              description: "Include detailed response metrics",
              default: true,
            },
            delay: {
              type: "number",
              description: "Artificial delay in milliseconds (for testing)",
              default: 0,
              minimum: 0,
              maximum: 5000,
            },
          },
        },
      },
    ];
  }

  async getEnhancedToolsList() {
    return {
      tools: this.getToolDefinitions(),
      metadata: this.metadata,
      runtime: {
        uptime: Date.now() - this.startTime,
        requestCount: this.requestCount,
      },
    };
  }

  async executeTool(name, args) {
    const startTime = Date.now();

    try {
      let result;

      switch (name) {
        case "get_system_info":
          result = await this.executeGetSystemInfo(args);
          break;
        case "calculate":
          result = await this.executeCalculate(args);
          break;
        case "list_files":
          result = await this.executeListFiles(args);
          break;
        case "read_file":
          result = await this.executeReadFile(args);
          break;
        case "write_log":
          result = await this.executeWriteLog(args);
          break;
        case "ping":
          result = await this.executePing(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      const executionTime = Date.now() - startTime;

      // Add execution metadata to result
      if (args.includeMetrics !== false) {
        result.metadata = {
          tool: name,
          executionTime,
          timestamp: new Date().toISOString(),
          requestId: this.requestCount,
        };
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Error(
        `Tool '${name}' execution failed after ${executionTime}ms: ${error.message}`
      );
    }
  }

  async executeGetSystemInfo(args) {
    const cpuCount = os.cpus().length;
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage_percent: (
          ((os.totalmem() - os.freemem()) / os.totalmem()) *
          100
        ).toFixed(2),
      },
      cpu: {
        count: cpuCount,
        model: os.cpus()[0]?.model || "Unknown",
        speed: os.cpus()[0]?.speed || 0,
      },
      cpu_count: cpuCount, // Backward compatibility with basic client format
      hostname: os.hostname(),
      user_info: os.userInfo(),
      network_interfaces: Object.keys(os.networkInterfaces()),
      load_average: os.loadavg(),
      temp_dir: os.tmpdir(),
      home_dir: os.homedir(),
    };

    if (args.includeProcessInfo) {
      systemInfo.process = {
        pid: process.pid,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        versions: process.versions,
        argv: process.argv,
        execPath: process.execPath,
        cwd: process.cwd(),
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(systemInfo, null, 2),
        },
      ],
    };
  }

  async executeCalculate(args) {
    const expression = args.expression;
    const precision = args.precision || 10;

    try {
      const result = this.enhancedEvaluateExpression(expression);
      const formattedResult =
        typeof result === "number" ? Number(result.toFixed(precision)) : result;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              expression,
              result: formattedResult,
              precision,
              type: typeof result,
              calculated_at: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Enhanced calculation error: ${error.message}`);
    }
  }

  async executeListFiles(args) {
    const directory = args.directory || ".";
    const includeHidden = args.includeHidden || false;
    const recursive = args.recursive || false;

    try {
      const result = await this.listFilesRecursive(
        directory,
        includeHidden,
        recursive
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              directory,
              options: { includeHidden, recursive },
              files: result.files,
              count: result.count,
              directories: result.directories,
              total_size: result.totalSize,
              scanned_at: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Enhanced file listing error: ${error.message}`);
    }
  }

  async executeReadFile(args) {
    const filePath = args.path;
    const encoding = args.encoding || "utf8";
    const maxSize = args.maxSize || 1048576; // 1MB default

    try {
      const stats = await fs.stat(filePath);

      if (stats.size > maxSize) {
        throw new Error(
          `File size (${stats.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`
        );
      }

      const content = await fs.readFile(filePath, encoding);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              path: filePath,
              content,
              size: content.length,
              file_size: stats.size,
              encoding,
              created: stats.birthtime,
              modified: stats.mtime,
              accessed: stats.atime,
              is_file: stats.isFile(),
              is_directory: stats.isDirectory(),
              permissions: stats.mode,
              read_at: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Enhanced file read error: ${error.message}`);
    }
  }

  async executeWriteLog(args) {
    const logEntry = {
      id: this.logEntries.length + 1,
      timestamp: new Date().toISOString(),
      level: args.level || "info",
      message: args.message,
      category: args.category || "general",
      metadata: args.metadata || {},
      client: this.metadata.name,
      version: this.metadata.version,
    };

    this.logEntries.push(logEntry);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            logged: logEntry,
            total_entries: this.logEntries.length,
            entries_by_level: this.getLogStatsByLevel(),
            categories: this.getLogCategories(),
          }),
        },
      ],
    };
  }

  async executePing(args) {
    const message = args.message || "Hello from Enhanced Private MCP Client";
    const includeMetrics = args.includeMetrics !== false;
    const delay = args.delay || 0;

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const response = {
      status: "Pong!",
      message,
      timestamp: new Date().toISOString(),
      client: this.metadata.name,
      version: this.metadata.version,
    };

    if (includeMetrics) {
      response.metrics = {
        uptime: Date.now() - this.startTime,
        total_requests: this.requestCount,
        memory_usage: process.memoryUsage(),
        delay_applied: delay,
        response_size: JSON.stringify(response).length,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  // Enhanced mathematical expression evaluator with better error handling
  enhancedEvaluateExpression(expression) {
    // Enhanced sanitization - allow more mathematical functions
    const allowedChars = /^[0-9+\-*/().\ \t\n]+$/;
    if (!allowedChars.test(expression)) {
      throw new Error(
        "Expression contains invalid characters. Only numbers and basic operators (+, -, *, /, parentheses) are allowed."
      );
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of expression) {
      if (char === "(") parenCount++;
      if (char === ")") parenCount--;
      if (parenCount < 0) throw new Error("Unbalanced parentheses");
    }
    if (parenCount !== 0) throw new Error("Unbalanced parentheses");

    // Prevent division by zero
    if (expression.includes("/0")) {
      throw new Error("Division by zero is not allowed");
    }

    try {
      const result = Function('"use strict"; return (' + expression + ")")();

      if (!isFinite(result)) {
        throw new Error("Result is not a finite number");
      }

      return result;
    } catch (error) {
      throw new Error("Invalid mathematical expression syntax");
    }
  }

  async listFilesRecursive(directory, includeHidden, recursive, depth = 0) {
    const maxDepth = 10; // Prevent infinite recursion
    if (depth > maxDepth) {
      throw new Error("Maximum directory depth exceeded");
    }

    const files = await fs.readdir(directory, { withFileTypes: true });
    const result = { files: [], count: 0, directories: 0, totalSize: 0 };

    for (const file of files) {
      if (!includeHidden && file.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(directory, file.name);
      const isDirectory = file.isDirectory();

      try {
        const stats = await fs.stat(fullPath);

        const fileInfo = {
          name: file.name,
          type: isDirectory ? "directory" : "file",
          path: fullPath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          permissions: stats.mode,
        };

        result.files.push(fileInfo);
        result.count++;

        if (isDirectory) {
          result.directories++;

          if (recursive) {
            const subResult = await this.listFilesRecursive(
              fullPath,
              includeHidden,
              recursive,
              depth + 1
            );
            result.files.push(...subResult.files);
            result.count += subResult.count;
            result.directories += subResult.directories;
            result.totalSize += subResult.totalSize;
          }
        } else {
          result.totalSize += stats.size;
        }
      } catch (error) {
        // Skip files we can't access
        console.warn(`Cannot access ${fullPath}: ${error.message}`);
      }
    }

    return result;
  }

  getLogStatsByLevel() {
    const stats = {};
    this.logEntries.forEach((entry) => {
      stats[entry.level] = (stats[entry.level] || 0) + 1;
    });
    return stats;
  }

  getLogCategories() {
    const categories = new Set();
    this.logEntries.forEach((entry) => {
      categories.add(entry.category);
    });
    return Array.from(categories);
  }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new EnhancedPrivateMCPClient(8080);

  process.on("SIGINT", async () => {
    console.log("\nShutting down Enhanced Private MCP client...");
    await client.stop();
    process.exit(0);
  });

  try {
    await client.start();
  } catch (error) {
    console.error("Failed to start Enhanced Private MCP client:", error);
    process.exit(1);
  }
}
