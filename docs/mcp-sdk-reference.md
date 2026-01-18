# MCP SDK Reference

> This is a condensed reference from the official [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) documentation. See the full docs at [modelcontextprotocol.io](https://modelcontextprotocol.io).

## Overview

The Model Context Protocol (MCP) allows applications to provide context for LLMs in a standardized way. This project uses the SDK to:
- Connect to MCP servers as a client (aggregating multiple servers)
- Expose aggregated tools to MCP clients (Claude Code, Cursor, etc.)

## Transports Used in This Project

### Client Side (Connecting to MCP Servers)

**StdioClientTransport** - For local MCP servers:
```typescript
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@anthropic-ai/mcp-server-github"],
  env: { GITHUB_TOKEN: "..." }
});
```

**SSEClientTransport** - For remote servers with `/sse` endpoint:
```typescript
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(new URL("http://localhost:3000/sse"));
```

**StreamableHTTPClientTransport** - For modern HTTP servers:
```typescript
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"));
```

### Server Side (Exposing to MCP Clients)

We use the low-level `Server` class for more control:
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const server = new Server(
  { name: "riglm", version: "1.0.0" },
  { capabilities: { tools: { listChanged: true } } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [/* aggregated tools */]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Route to appropriate backend server
});
```

## Key Capabilities

### Tool List Changed Notification

When tools are dynamically added/removed, notify clients:
```typescript
// Server capability
{ capabilities: { tools: { listChanged: true } } }

// Client will re-fetch tools when notified
```

This is critical for Phase 2 (dynamic extension toggle).

### Client Connection

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({ name: "riglm-bridge", version: "0.0.1" });
await client.connect(transport);

// List tools from server
const { tools } = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: "tool-name",
  arguments: { arg1: "value" }
});
```

## Transport Selection Logic

In `backend.service.ts`:
```typescript
if (serverConfig.url.endsWith('/sse')) {
  // Use SSEClientTransport (legacy)
  transport = new SSEClientTransport(new URL(serverConfig.url));
} else {
  // Use StreamableHTTPClientTransport (modern)
  transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
}
```

## Error Handling

```typescript
import { SseError } from "@modelcontextprotocol/sdk/client/sse.js";

try {
  await client.connect(transport);
} catch (error) {
  if (error instanceof SseError && error.code === 401) {
    // Handle authentication error
  }
}
```

## Useful Links

- [MCP Specification](https://spec.modelcontextprotocol.io)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Example Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - Testing tool
