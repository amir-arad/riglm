# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Riglm** is a TypeScript middleware server that aggregates multiple MCP (Model Context Protocol) servers into a single endpoint. It's the backend for the AI Extension Manager.

## Runtime

This project uses **Bun** as the runtime, package manager, and test runner.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Development with hot reload (bun --watch)
bun run build        # Production build
bun run build:standalone  # Build standalone executable with embedded assets
bun run start        # Run production build
bun test             # Run all tests (Bun test runner)
bun run lint         # ESLint
bun run typecheck    # Type check
```

## Architecture

The server uses a **hexagonal architecture** (ports/adapters pattern) for clean separation of concerns.

### Core Components

1. **RiglmServer** (`src/server.ts`) - Express server with Helmet security and Morgan logging

2. **Ports** (`src/ports/`) - Abstract interfaces:
   - `logger.port.ts` - Logging contract
   - `config-storage.port.ts` - Configuration storage
   - `mcp-client.port.ts` / `mcp-server.port.ts` - MCP contracts
   - `transport.port.ts` - Transport layer

3. **Domain** (`src/domain/`) - Pure business logic:
   - `types.ts` - Configuration types (Zod schemas)
   - `filter-engine.ts` - Tool filtering with glob patterns
   - `config-resolver.ts` - Config validation (Zod)
   - `tool-aggregator.ts` - Tool namespacing/aggregation
   - `extension.ts` - Extension types (Zod schemas)

4. **Adapters** (`src/adapters/`) - Implementations:
   - `http/` - Express routes and error middleware
   - `logging/` - Winston logger adapter
   - `storage/` - File-based config adapter
   - `mcp/` - MCP SDK client/server/transport adapters

5. **Application** (`src/application/`) - Services:
   - `hosts.service.ts` - MCP server instances per endpoint
   - `backend.service.ts` - MCP client connections per session

6. **Host Gateway** (`src/host-gateway/`) - Session management:
   - `transport-session-manager.ts` - Client session lifecycle

7. **Extension Manager** (`src/extension-manager/`) - Extension registry:
   - `extension.registry.ts` - CRUD operations for extensions
   - File-based persistence via `ExtensionStoragePort`

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

- `src/index.ts` - Entry point (wires adapters to ports)
- `src/server.ts` - RiglmServer (Express app)
- `src/embedded-assets.ts` - Embedded static asset serving for standalone builds
- `src/domain/types.ts` - Configuration and tool types
- `src/domain/filter-engine.ts` - Tool filtering engine
- `src/application/hosts.service.ts` - Tool aggregation per endpoint
- `src/application/backend.service.ts` - MCP client connections
- `src/application/config.service.ts` - Configuration loading and validation
- `src/adapters/http/routes.ts` - HTTP routes
- `src/host-gateway/transport-session-manager.ts` - Session lifecycle
- `src/etc/service.ts` - Service container with cleanup

## Testing

173 tests using Bun's built-in test runner:

```bash
bun test                           # Run all tests
bun test test/filter.test.ts       # Run specific file
bun test --watch                   # Watch mode
```

### Test Structure

| File | Purpose |
|------|---------|
| `test/filter.test.ts` | Glob pattern matching for tool filters |
| `test/e2e/happy-flow.e2e.test.ts` | Basic integration flow |
| `test/e2e/e2e.test.ts` | Full integration with mock MCP servers |
| `test/e2e/filtering.e2e.test.ts` | Tool filtering in real requests |
| `test/e2e/error-handling.test.ts` | Error and cleanup scenarios |
| `test/e2e/stream-termination.test.ts` | SSE stream lifecycle |
| `test/e2e/resource-deallocation.test.ts` | Memory and resource cleanup |
| `test/extension.test.ts` | Extension domain types and Zod validation |
| `test/extension-registry.test.ts` | ExtensionRegistry CRUD operations |

### Test Fixtures

- `test/fixtures/mock-server.ts` - Base mock server utilities
- `test/fixtures/mock-cli-server.ts` - Stdio MCP server mock
- `test/fixtures/mock-sse-server.ts` - SSE MCP server mock

### Test Mocks

- `test/mocks/mock-config.ts` - Configuration mocks
- `test/mocks/mock-logger.ts` - Logger mock

## Debugging

```bash
# Run with verbose logging
LOG_LEVEL=debug bun run dev

# Run single test with output
bun test test/filter.test.ts --verbose
```
