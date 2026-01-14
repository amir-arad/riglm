# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ghostwheels** is a TypeScript middleware server that aggregates multiple MCP (Model Context Protocol) servers into a single endpoint. It's the backend for the Personal AI Extension Manager.

## Runtime

This project uses **Bun** as the runtime, package manager, and test runner.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Development with hot reload (bun --watch)
bun run build        # Production build
bun run start        # Run production build
bun test             # Run all tests (Bun test runner)
bun run lint         # ESLint
bun run typecheck    # Type check
```

## Architecture

### Core Components

1. **AbcServer** (`src/server.ts`) - Express server with:
   - Helmet security middleware
   - Morgan logging
   - Host gateway routes for MCP connections

2. **ConfigManager** (`src/config-manager.ts`) - JSON5-based config:
   - Two-tier structure: Servers → Endpoints
   - Server and endpoint-specific tool filtering
   - Runtime validation

3. **Backend Service** (`src/backend.service.ts`) - MCP client connections:
   - Local servers via stdio transport
   - Remote servers via SSE (URLs ending in `/sse`) or HTTP transport
   - Connection retry logic with AbortSignal support

4. **Host Gateway** (`src/host-gateway/`) - MCP server proxy:
   - **HostsService** - Manages MCP server instances per endpoint
   - **TransportSessionManager** - Handles client session lifecycle
   - Tool namespacing: `serverName-toolName`

### Request Flow

```
MCP Client (Claude Code, Cursor, etc.)
  → GET /:endpointId/sse
    → HostsService creates session
      → Backend connects to configured MCP servers
        → Tools aggregated with namespace prefix
          → Client receives combined tool list
```

## Configuration

Config file: `data/config.local.json5` (JSON5 format)

```json5
{
  "servers": {
    "github": {
      "command": "bunx",
      "args": ["@anthropic-ai/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "..." },
      "filters": ["*_dangerous"]  // Optional server-specific filters
    },
    "remote_service": {
      "url": "http://localhost:3001/sse",  // SSE transport
      "headers": { "Authorization": "Bearer ..." }
    }
  },
  "endpoints": {
    "main": {
      "servers": ["github", "remote_service"],
      "description": "Main endpoint",
      "filters": ["*_debug"]  // Optional endpoint-specific filters
    }
  },
  "filters": ["*_internal"]  // Optional global filters
}
```

### Filter Priority
Server filters > Endpoint filters > Global filters

### Identifier Pattern
Server and endpoint names must match: `^[a-zA-Z_][a-zA-Z0-9_]*$`

## Environment Variables

```bash
CONFIG_PATH=./data/config.local.json5  # Configuration file path
PORT=3000                              # Server port
LOG_LEVEL=info                         # Winston log level (debug, info, warn, error)
```

## API Endpoints

- `GET /:endpointId/sse` - SSE endpoint for MCP client connections
- `POST /:endpointId/messages/:sessionId` - MCP message handling
- `GET /:endpointId/status` - Health check for specific endpoint

## Key Files

- `src/index.ts` - Entry point
- `src/server.ts` - Express app setup
- `src/config-manager.ts` - Configuration loading
- `src/backend.service.ts` - MCP client connections
- `src/host-gateway/hosts.service.ts` - Tool aggregation
- `src/host-gateway/controller.ts` - HTTP routes
- `src/etc/filter.ts` - Tool filtering engine
- `src/etc/service.ts` - Service container with cleanup

## Testing

40 tests using Bun's built-in test runner:

```bash
bun test                           # Run all tests
bun test test/filter.test.ts       # Run specific file
bun test --watch                   # Watch mode
```

### Test Structure

| File | Purpose |
|------|---------|
| `test/config-manager.test.ts` | Config loading and filter resolution |
| `test/filter.test.ts` | Glob pattern matching for tool filters |
| `test/hosts-service.test.ts` | Session and tool aggregation |
| `test/e2e/e2e.test.ts` | Full integration with mock MCP servers |
| `test/e2e/filtering.e2e.test.ts` | Tool filtering in real requests |
| `test/e2e/error-handling.test.ts` | Error and cleanup scenarios |
| `test/e2e/stream-termination.test.ts` | SSE stream lifecycle |
| `test/e2e/resource-deallocation.test.ts` | Memory and resource cleanup |

### Test Fixtures

- `test/fixtures/mock-cli-server.ts` - Stdio MCP server mock
- `test/fixtures/mock-sse-server.ts` - SSE MCP server mock

## Debugging

```bash
# Run with verbose logging
LOG_LEVEL=debug bun run dev

# Run single test with output
bun test test/filter.test.ts --verbose
```
