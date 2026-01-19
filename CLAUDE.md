# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product: RigLM - MCP Context Router

A multiplexer that routes MCP (Model Context Protocol) servers through unified endpoints. Users define MCP servers once and expose them to multiple AI tools (Claude Code, Cursor, Cline) with per-endpoint filtering.

See `docs/implementation-plan.md` for development roadmap and `docs/notes.md` for technical decisions.

## Commands

```bash
# Development
bun install                    # Install dependencies
bun run dev                    # Dev server with hot reload (port 3000)
bun test                       # Run all tests
bun test test/filter.test.ts   # Run single test file
bun run test:e2e               # Run Playwright UI tests
bun run test:e2e:ui            # Playwright UI mode (interactive)

# Quality checks
bun run typecheck              # TypeScript type checking
bun run lint                   # ESLint
bun run format                 # Prettier formatting
bun run deps:check             # Validate hexagonal architecture rules
bun run deps:graph             # Generate dependency graph (SVG)
bun run circular               # Check for circular dependencies
bun run deadcode               # Find unused exports (knip)

# Production
bun run build                  # Build to dist/
bun run build:standalone       # Single executable (~102MB, no runtime needed)
bun run start                  # Run production build

# Release (runs lint, typecheck, tests, then tags and pushes)
bun run release:patch          # 0.0.1 → 0.0.2
bun run release:minor          # 0.0.1 → 0.1.0
bun run release:major          # 0.0.1 → 1.0.0
```

## Testing

Bun's built-in test runner. Tests located in `test/`:

- `filter.test.ts` - Unit tests for FilterEngine glob patterns
- `e2e/*.test.ts` - End-to-end tests using mock MCP servers from `fixtures/`
- `fixtures/` - Mock stdio MCP servers for testing
- `mocks/` - Mock config and logger implementations

## Architecture

Hexagonal (ports-adapters) architecture enforced by dependency-cruiser:

```
┌─────────────────────────────────────────────────────────────────┐
│  cli/           Entry point, argument parsing                   │
│  ↓                                                              │
│  application/   Services: RiglmServer, HostsService,            │
│                 BackendService, TransportSessionManager         │
│  ↓              (depends on ports, domain)                      │
│  ports/         Abstract interfaces (LoggerPort, McpClientPort) │
│  domain/        Pure logic: FilterEngine, ToolAggregator,       │
│                 config schemas (Zod)                            │
│  ↑                                                              │
│  adapters/      Implementations: Winston, Express routes,       │
│                 MCP SDK client/server, file config              │
└─────────────────────────────────────────────────────────────────┘
```

**Key constraint:** Domain and ports layers cannot import from adapters or application.

### Core Services (application/)

| Service | Purpose |
|---------|---------|
| `RiglmServer` | Express app composition, starts HTTP server |
| `HostsService` | Per-endpoint MCP server, manages sessions and tool aggregation |
| `BackendService` | Connects to downstream MCP servers (stdio/SSE/HTTP) |
| `TransportSessionManager` | Tracks active client connections |
| `ConfigService` | Exposes config via REST API |

### CloseablePool Pattern

Services use `CloseablePool` (`src/etc/closeable.ts`) for lazy initialization with automatic cleanup:

```typescript
const pool = createCloseablePool(
  async (key) => { /* create resource */ },
  "ResourceName",
  logger
);
const resource = await pool.get("key");  // Lazily creates
await pool.close();                       // Cleans up all
```

### Data Flow

1. MCP client connects to `/:endpointId/sse`
2. `HostsService` creates session, spawns `BackendService` connections to configured servers
3. `ToolAggregator` combines tools from all servers, applies `FilterEngine`
4. Tools namespaced as `serverName-toolName` to prevent collisions
5. Tool calls routed to appropriate backend via `toolHandlers` map

## Configuration

JSON5 config at `~/.config/riglm/config.json5` or `CONFIG_PATH`:

```json5
{
  "servers": {
    "github": { "command": "bunx", "args": ["@anthropic-ai/mcp-server-github"] },
    "remote": { "url": "http://localhost:3001/sse" }  // /sse = SSE, else HTTP
  },
  "endpoints": {
    "main": {
      "servers": ["github", "remote"],
      "filters": ["*_dangerous"]  // Glob patterns to exclude tools
    }
  }
}
```

**Server names:** Must match `^[a-zA-Z_][a-zA-Z0-9_]*$` (no dashes - conflicts with tool namespacing).

**Transport detection:** URLs ending in `/sse` use SSE transport; all others use HTTP.

**Filter patterns:** Glob-style with special `**-` for namespaced matching:
- `*_dangerous` - matches `delete_dangerous`, `admin_dangerous`
- `**-*_debug` - matches `github-list_debug`, `fs-read_debug` (any server)
- `tool_?` - single character wildcard

## Coding Standards

- **Zod validation:** All external data (config, API) validated with Zod schemas in `domain/`
- **Hexagonal discipline:** Run `bun run deps:check` to verify layer boundaries
- **No `any`:** Use `unknown` and narrow with Zod
- **No `console.log`:** Use `LoggerPort` abstraction
- **Named exports only:** No `default export`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONFIG_PATH` | Auto-detected | Config file path |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, `silent` |

## Skills

Project includes `mcp-testing` skill in `.claude/skills/` for MCP server testing patterns.

## Documentation

- `docs/implementation-plan.md` - Development roadmap (Phases 1-4)
- `docs/architecture.md` - Bootstrap sequence, service wiring
- `docs/notes.md` - Technical decisions and known debt
- `docs/tool_filtering_guide.md` - Filter pattern reference
- `docs/mcp-sdk-reference.md` - MCP SDK usage patterns
