# Personal AI Extension Manager

A unified platform that aggregates multiple MCP (Model Context Protocol) servers into a single endpoint. Define your LLM extensions in one place, then connect from any MCP-compatible client (Claude Code, Cursor, Cline, etc.).

## Features

- **MCP Server Aggregation** - Combine multiple MCP servers (local or remote) into unified endpoints
- **Tool Namespacing** - Tools are automatically prefixed with server names (`github-list_repos`) to avoid conflicts
- **Flexible Configuration** - JSON5 config with support for local (stdio) and remote (SSE/HTTP) servers
- **Tool Filtering** - Filter out unwanted tools at global, endpoint, or server level
- **Multiple Endpoints** - Create different endpoints for different use cases (development, production, etc.)
- **Web UI** - React-based dashboard for monitoring and management

## Architecture

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Claude Code    │  │     Cursor      │  │     Cline       │
│  (MCP Client)   │  │  (MCP Client)   │  │  (MCP Client)   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └──────────────┬─────┴────────────────────┘
                        │  SSE/HTTP
                        v
              ┌─────────────────────┐
              │   Extension Manager │
              │   (Express Server)  │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         v               v               v
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ MCP Srv │    │ MCP Srv │    │ MCP Srv │
    │ (stdio) │    │ (stdio) │    │  (SSE)  │
    └─────────┘    └─────────┘    └─────────┘
```

## Prerequisites

- **Bun** 1.x or higher (recommended)
- Or **Node.js** 18.x or higher with npm

## Local Setup Guide

### 1. Clone the Repository

```bash
git clone <repository-url>
cd abc
```

### 2. Server Setup

```bash
cd server
bun install
```

#### Create Configuration File

Copy the example configuration and customize it:

```bash
mkdir -p data
cp config.simplified.example.json5 data/config.local.json5
```

Edit `data/config.local.json5` to define your MCP servers:

```json5
{
  // Define MCP servers (local or remote)
  "servers": {
    // Local server using stdio transport
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/allowed/dir"],
      "description": "Filesystem access"
    },
    // Remote server using SSE transport
    "github": {
      "url": "http://localhost:3001/sse",
      "description": "GitHub operations",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    },
    // Remote server using HTTP transport
    "calculator": {
      "url": "http://localhost:3002",
      "description": "Calculator service"
    }
  },

  // Define endpoints that expose server groups
  "endpoints": {
    "main": {
      "servers": ["filesystem", "github", "calculator"],
      "description": "Main development endpoint"
    },
    "minimal": {
      "servers": ["filesystem"],
      "description": "Minimal endpoint with filesystem only"
    }
  }
}
```

#### Start the Server

```bash
# Development mode (with hot reload)
bun run dev

# Or production mode
bun run build
bun run start
```

The server will start on port 3000 by default.

### 3. Client Setup (Optional)

The web UI provides a dashboard for monitoring your endpoints and servers.

```bash
cd client
bun install
bun run dev
```

The client will start on http://localhost:8080.

## Configuration Reference

### Server Types

**Local Server (stdio)**
```json5
{
  "command": "npx",
  "args": ["-y", "@anthropic-ai/mcp-server-github"],
  "env": {
    "GITHUB_TOKEN": "ghp_xxx"
  },
  "description": "GitHub MCP server"
}
```

**Remote Server (SSE)** - URL ends with `/sse`
```json5
{
  "url": "http://localhost:3001/sse",
  "headers": {
    "Authorization": "Bearer xxx"
  },
  "description": "Remote SSE server"
}
```

**Remote Server (HTTP)**
```json5
{
  "url": "http://localhost:3002",
  "description": "Remote HTTP server"
}
```

### Tool Filtering

Filter out unwanted tools using glob patterns:

```json5
{
  "servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "filters": ["*_dangerous", "*_admin"]  // Server-specific filters
    }
  },
  "endpoints": {
    "production": {
      "servers": ["github"],
      "filters": ["*_debug"]  // Endpoint-specific filters
    }
  },
  "filters": ["*_internal"]  // Global filters (lowest priority)
}
```

**Filter priority:** Server filters > Endpoint filters > Global filters

## Connecting MCP Clients

### Claude Code

Add to your Claude Code MCP configuration (`~/.config/claude-code/config.json` or project-level):

```json
{
  "mcpServers": {
    "extension-manager": {
      "url": "http://localhost:3000/main/sse"
    }
  }
}
```

### Cursor

Add to your Cursor settings:

```json
{
  "mcp.servers": {
    "extension-manager": {
      "url": "http://localhost:3000/main/sse"
    }
  }
}
```

### Other MCP Clients

Use the SSE endpoint URL: `http://localhost:3000/<endpoint-id>/sse`

Replace `<endpoint-id>` with the endpoint name from your configuration (e.g., `main`, `minimal`).

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:endpointId/sse` | GET | SSE endpoint for MCP client connections |
| `/:endpointId/messages/:sessionId` | POST | MCP message handling |
| `/:endpointId/status` | GET | Health check for specific endpoint |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONFIG_PATH` | `./data/config.local.json5` | Path to configuration file |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `NODE_ENV` | `development` | Environment mode |

## Development Commands

### Server

```bash
cd server
bun run dev          # Development with hot reload
bun run build        # Production build
bun run start        # Run production build
bun test             # Run tests (Bun test runner)
bun run lint         # Run ESLint
bun run typecheck    # Type checking
```

### Client

```bash
cd client
bun run dev          # Vite dev server (port 8080)
bun run build        # Production build
bun run preview      # Preview production build
bun run lint         # Run ESLint
```

## Project Structure

```
abc/
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── server.ts       # Express app setup
│   │   ├── config-manager.ts   # Configuration loading
│   │   ├── backend.service.ts  # MCP client connections
│   │   └── host-gateway/   # MCP server proxy
│   │       ├── hosts.service.ts    # Server management
│   │       ├── controller.ts       # HTTP routes
│   │       └── transport-session-manager.ts
│   └── test/               # Test files
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/            # API integrations
│   │   └── components/     # UI components
│   └── index.html
└── README.md
```

## License

ISC
