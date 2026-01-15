# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product: Personal AI Extension Manager

A unified platform where users define their LLM extensions (MCP servers, knowledge artifacts) in ONE PLACE, then dynamically attach/detach each extension to/from sessions across multiple MCP-compatible LLM tools (Claude Code, Cursor, Cline, etc.).

## Current Status

**Phase 1 (Foundation)** - In Progress
- [x] Workspace cleanup - removed unrelated projects
- [x] Config consolidation - simplified 2-tier format (servers → endpoints)
- [x] Dead code removal - removed unused RPC endpoint
- [x] Migrated to Bun runtime (faster startup, native TypeScript, built-in test runner)
- [x] Architecture refactor - hexagonal/ports-adapters pattern
- [x] Extension registry - file-based CRUD for extensions (Zod validation)

**Upcoming:** Phase 2 (Dynamic State), Phase 3 (WebSocket), Phase 4 (Client Redesign)

See `docs/implementation-plan.md` for full roadmap.

## Project Structure

```
abc/
├── .claude/         # Claude Code configuration
│   └── skills/      # Project-specific skills (mcp-testing)
├── server/          # Express backend - MCP aggregator
│   └── src/         # Hexagonal architecture (ports/adapters pattern)
│       ├── ports/       # Abstract interfaces
│       ├── domain/      # Business logic
│       ├── adapters/    # Implementations
│       └── application/ # Services
├── client/          # React frontend - Web UI (placeholder, Phase 4)
├── docs/            # Documentation and plans
└── schemas/         # Configuration examples
```

## Runtime

This project uses **Bun** as the runtime, package manager, and test runner.

## Quick Start

```bash
# Server
cd server
bun install
bun run dev          # Development (port 3000)

# Client (separate terminal)
cd client
bun install
bun run dev          # Vite dev server (port 8080)
```

## Server Commands

```bash
bun install          # Install dependencies
bun run dev          # Development with hot reload (bun --watch)
bun run build        # Production build
bun run start        # Run production build
bun test             # Run all tests (Bun test runner)
bun run lint         # ESLint
bun run typecheck    # Type check
```

## Client Commands

```bash
bun install          # Install dependencies
bun run dev          # Vite dev server (port 8080)
bun run build        # Production build
bun run preview      # Preview production build
```

## Testing

The server has 105 tests using Bun's built-in test runner:

```bash
cd server
bun test                       # Run all tests
bun test test/filter.test.ts   # Run specific test file
```

Test structure:
- `test/filter.test.ts` - Unit tests for filter engine
- `test/extension.test.ts` - Extension domain types and Zod validation
- `test/extension-registry.test.ts` - ExtensionRegistry CRUD operations
- `test/e2e/*.test.ts` - E2E tests (happy-flow, filtering, error handling, streams, resources)
- `test/fixtures/` - Mock MCP servers for testing
- `test/mocks/` - Mock config and logger

## Configuration

Config file: `server/data/config.local.json5`

```json5
{
  "servers": {
    "github": {
      "command": "bunx",
      "args": ["@anthropic-ai/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "..." }
    },
    "filesystem": {
      "command": "bunx",
      "args": ["@anthropic-ai/mcp-server-filesystem", "/path"]
    }
  },
  "endpoints": {
    "main": {
      "servers": ["github", "filesystem"],
      "filters": ["*_dangerous"]  // Optional tool filters
    }
  }
}
```

## Architecture

```
MCP Clients (Claude Code, Cursor, Cline)
         │
         │ SSE/HTTP
         ▼
┌─────────────────────┐
│  Extension Manager  │ ◄── Dynamic toggle per session (planned)
│  (Express Server)   │
└──────────┬──────────┘
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
┌─────┐ ┌─────┐ ┌─────┐
│ MCP │ │ MCP │ │ MCP │  Local (stdio) or Remote (SSE/HTTP)
│ Srv │ │ Srv │ │ Srv │
└─────┘ └─────┘ └─────┘
```

## Key Concepts

- **Extension**: An MCP server (local via stdio or remote via HTTP/SSE)
- **Session**: A connection from an MCP client
- **Profile**: A saved configuration of enabled/disabled extensions (planned)
- **Tool Namespacing**: Tools prefixed with server name (`github-list_repos`)

## Environment Variables

```bash
CONFIG_PATH=./data/config.local.json5  # Configuration file
PORT=3000                              # Server port
LOG_LEVEL=info                         # Logging level
```

## Skills

This project includes the `mcp-testing` skill in `.claude/skills/` for MCP server testing patterns.

## Related Documentation

- `docs/implementation-plan.md` - Detailed implementation roadmap
- `docs/notes.md` - Assumptions, insights, and technical debt
- `docs/mcp-sdk-reference.md` - MCP SDK usage reference
- `server/CLAUDE.md` - Server-specific documentation
