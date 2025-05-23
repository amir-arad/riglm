import { SocksProxyAgent } from "socks-proxy-agent";

/**
 * Public MCP Server (accessible from internet)
 * Connects to private MCP client through SOCKS proxy
 * This is actually an MCP Client that consumes tools from the private server
 */
export class PublicMCPServer {
  constructor(
    privateClientUrl = "http://localhost:8080",
    socksProxyUrl = "socks5://localhost:1080"
  ) {
    this.privateClientUrl = privateClientUrl;
    this.socksProxyUrl = socksProxyUrl;
    this.agent = null;
    this.connected = false;
  }

  async connect() {
    try {
      // Test connection with health check - retry up to 5 times with progressive delays
      let lastError;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          console.log(`🔗 Attempting SOCKS connection (${attempt}/5)...`);
          // Create fresh SOCKS proxy agent for each attempt
          this.agent = new SocksProxyAgent(this.socksProxyUrl);

          // First verify health endpoint
          await this.makeRequest("/health", "GET");

          // Then verify MCP communication works by doing a simple MCP request
          await this.makeRequest("/mcp", "POST", {
            method: "tools/list",
          });

          this.connected = true;
          console.log(
            `✅ Public MCP server connected to private client via SOCKS proxy on attempt ${attempt}`
          );
          return;
        } catch (error) {
          lastError = error;
          console.log(
            `❌ Connection attempt ${attempt} failed: ${error.message}`
          );
          // Clean up failed agent
          this.agent = null;
          if (attempt < 5) {
            // Progressive delay
            const delay = 75 * attempt;
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      throw lastError;
    } catch (error) {
      console.error("Failed to connect to private client:", error);
      throw error;
    }
  }

  async makeRequest(path, method = "POST", body = null) {
    if (!this.agent) {
      throw new Error("SOCKS proxy agent not initialized");
    }

    const url = `${this.privateClientUrl}${path}`;
    const options = {
      method,
      agent: this.agent,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      try {
        const errorBody = await response.json();
        // Extract error message from JSON-RPC error response or simple error object
        const errorMessage =
          errorBody.error?.message ||
          errorBody.error ||
          `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return await response.json();
  }

  async listTools() {
    if (!this.connected) {
      throw new Error("Client not connected");
    }

    const response = await this.makeRequest("/mcp", "POST", {
      method: "tools/list",
    });
    // Handle both basic client format {tools: []} and enhanced JSON-RPC format {result: {tools: []}}
    return response.result?.tools || response.tools;
  }

  async callTool(name, args = {}) {
    if (!this.connected) {
      throw new Error("Client not connected");
    }

    const response = await this.makeRequest("/mcp", "POST", {
      method: "tools/call",
      params: { name, arguments: args },
    });
    // Handle both basic client format (direct result) and enhanced JSON-RPC format {result: {}}
    return response.result || response;
  }

  async ping(message = "Hello from public server") {
    return await this.callTool("ping", { message });
  }

  async disconnect() {
    if (this.connected) {
      this.connected = false;
      console.log("Public MCP server disconnected");
    }
  }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PublicMCPServer();

  process.on("SIGINT", async () => {
    console.log("\nShutting down public MCP server...");
    await server.disconnect();
    process.exit(0);
  });

  try {
    await server.connect();

    // Test the connection
    const tools = await server.listTools();
    console.log("Available tools:", tools);

    const result = await server.ping("Test from public server");
    console.log("Ping result:", result);
  } catch (error) {
    console.error("Failed to start public MCP server:", error);
    process.exit(1);
  }
}
