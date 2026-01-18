# MCP remote transport

**Streamable HTTP is now the official transport for remote MCP servers**, having replaced the original HTTP+SSE transport in March 2025. The protocol currently defines exactly two standard transports: **stdio** for local subprocess-based connections and **Streamable HTTP** for remote servers. SSE as a standalone transport is deprecated, though it remains available as an optional streaming mechanism within Streamable HTTP. WebSocket is not officially supported.

## Protocol evolution from HTTP+SSE to Streamable HTTP

The MCP specification has undergone a significant transport evolution since its November 2024 launch. The original **protocol version 2024-11-05** defined HTTP+SSE as the remote transport, requiring two separate endpoints: a GET endpoint for server-to-client SSE streaming and a POST endpoint for client-to-server messages. This architecture proved problematic for modern infrastructure.

**Protocol version 2025-03-26** introduced Streamable HTTP as the replacement, consolidating communication into a single endpoint supporting both POST and GET methods. The specification explicitly states: "This replaces the HTTP+SSE transport from protocol version 2024-11-05." SSE now functions as an optional response format within Streamable HTTP rather than a transport in its own right.

The motivations for this change were clear:

| HTTP+SSE Limitation | Streamable HTTP Solution |
|---------------------|--------------------------|
| Two endpoints required | Single unified `/mcp` endpoint |
| Complex cross-connection state | Explicit `Mcp-Session-Id` header |
| No resumption mechanism | Event IDs with `Last-Event-ID` support |
| Difficult load balancer routing | Standard HTTP patterns |
| Poor serverless compatibility | Moving toward stateless design |

## The two official transports in detail

**stdio transport** remains the recommended option for local integrations where the client launches the MCP server as a subprocess. The server reads JSON-RPC messages from stdin and writes responses to stdout, with messages delimited by newlines. The specification states: "Clients SHOULD support stdio whenever possible."

**Streamable HTTP transport** is the standard for remote connections. Servers expose a single HTTP endpoint that handles both directions of communication:

```typescript
// Server setup with the TypeScript SDK
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID()
});
await server.connect(transport);
```

Responses can use either `Content-Type: application/json` for single JSON-RPC responses or `Content-Type: text/event-stream` for SSE streaming when multiple messages are needed. This flexibility allows basic MCP servers to operate without SSE complexity while enabling advanced features like server-to-client notifications and request streaming.

## WebSocket status: proposed but not adopted

WebSocket is **not an official MCP transport**. A formal proposal (SEP-1288) was submitted in August 2025 and remains under review. The Transport Working Group confirmed in December 2025 that MCP will continue supporting only two official transports—stdio and Streamable HTTP.

Community implementations exist for specialized use cases. Netdata's MCP server uses WebSocket (`ws://netdata-ip:19999/mcp`), and projects like `nchan-mcp-transport` provide WebSocket-to-MCP bridges. The specification does allow custom transports: "Clients and servers MAY implement additional custom transport mechanisms to suit their specific needs."

## What major implementations actually use

In practice, **stdio dominates** current MCP server deployments—roughly 90% of servers use it. This reflects historical client constraints: Claude Desktop's configuration file originally only supported stdio, and most MCP servers (filesystem, GitHub, PostgreSQL, SQLite, Git) are designed for local execution.

```json
// Typical Claude Desktop config using stdio
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
```

For remote servers, Streamable HTTP is gaining adoption. GitHub's official remote MCP server at `https://api.githubcopilot.com/mcp/` uses it:

```bash
# Claude Code CLI with Streamable HTTP
claude mcp add --transport http github https://api.githubcopilot.com/mcp \
  -H "Authorization: Bearer $TOKEN"
```

**Transport proxy tools** bridge the gap for clients that only support stdio. `mcp-remote`, `supergateway`, and `mcp-proxy` let stdio-only clients connect to remote Streamable HTTP or legacy SSE servers:

```json
// Connect stdio client to remote server via proxy
{
  "mcpServers": {
    "remote": {
      "command": "npx",
      "args": ["mcp-remote", "https://remote.mcp.server/mcp"]
    }
  }
}
```

## SDK support across languages

The official SDKs provide consistent transport support:

| SDK | Transports Supported |
|-----|---------------------|
| **TypeScript** (`@modelcontextprotocol/sdk`) | stdio, Streamable HTTP, SSE (deprecated) |
| **Python** (`mcp` / FastMCP) | stdio, Streamable HTTP, SSE |
| **Go** (Google) | stdio, Streamable HTTP |
| **Kotlin** (JetBrains) | stdio, SSE, WebSocket |
| **C#** (Microsoft) | stdio, HTTP |

The TypeScript SDK provides dedicated classes for each transport:

```typescript
// Streamable HTTP (recommended for remote)
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// stdio (for local)
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// SSE (deprecated, backwards compat only)
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
```

Python's FastMCP framework makes transport selection straightforward:

```python
from fastmcp import FastMCP

mcp = FastMCP("My Server")
mcp.run(transport="streamable-http")  # Runs on http://localhost:8000/mcp
```

## Client transport capabilities

Client support varies significantly:

**Claude Desktop** supports stdio natively through its config file. Remote Streamable HTTP servers require either a Pro/Max/Team/Enterprise subscription (using Settings → Connectors) or a transport proxy like `mcp-remote`.

**Claude Code CLI** has full transport support: `--transport stdio`, `--transport sse`, and `--transport http` all work directly.

**Cursor IDE** added direct SSE support in v0.48.0 for unauthenticated servers, though OAuth-protected SSE endpoints still require `mcp-remote`.

**VS Code** supports both stdio and HTTP via `.vscode/mcp.json`.

## Conclusion

For new remote MCP server implementations, **use Streamable HTTP**—it's the officially recommended transport with better infrastructure compatibility than the deprecated HTTP+SSE approach. For local development and CLI tools, stdio remains the standard. WebSocket enthusiasts will need to use community bridges until SEP-1288 is resolved, which appears unlikely given the Transport Working Group's December 2025 confirmation that only two transports will be officially supported.

The key insight for TypeScript developers: import `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js` for remote servers, design your endpoint to handle both JSON and SSE responses based on client needs, and implement proper session management via the `Mcp-Session-Id` header.
