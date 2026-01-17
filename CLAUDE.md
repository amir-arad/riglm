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
├── client/          # Static Web UI
│   └── public/      # Vanilla HTML/CSS/JS (single-page)
├── docs/            # Documentation and plans
└── schemas/         # Configuration schema
```

## Tech Stack

- **Runtime:** Bun 1.x
- **Language:** TypeScript 5.3 (Strict)
- **Framework:** Express 5.1
- **Validation:** Zod 3.22
- **MCP SDK:** @modelcontextprotocol/sdk 1.12
- **Testing:** Bun test runner
- **Config:** JSON5

## Quick Start

```bash
# Server
cd server
bun install
bun run dev          # Development (port 3000)

# Client (served by Express)
# Static files in client/public/ are served at /ui
# Access at http://localhost:3000/ui
```

## Standalone Distribution

Build a single executable with embedded web client (no Bun/Node.js required):

```bash
cd server
bun run build:standalone    # Creates dist/abc-server (~102MB)

# Run anywhere
CONFIG_PATH=/path/to/config.json5 ./dist/abc-server
```

## Server Commands

```bash
bun install          # Install dependencies
bun run dev          # Development with hot reload (bun --watch)
bun run build        # Production build
bun run build:standalone  # Build standalone executable (no runtime required)
bun run start        # Run production build
bun test             # Run all tests (Bun test runner)
bun run lint         # ESLint
bun run typecheck    # Type check
```

## Client

The web UI is a vanilla HTML/CSS/JS single-page application in `client/public/`. It is served by the Express server at `/ui` - no separate build step required.

## Testing

The server has 173 tests using Bun's built-in test runner:

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

## Coding Standards

- **Zod first:** All external data (config, API inputs) validated with Zod schemas in `domain/`
- **Hexagonal discipline:** Domain/ports layers must not import from adapters
- **No `any`:** Use `unknown` and narrow with Zod if type is uncertain
- **No `console.log`:** Use `LoggerPort` abstraction
- **Named exports only:** No `default export`

## Related Documentation

- `docs/implementation-plan.md` - Detailed implementation roadmap
- `docs/notes.md` - Assumptions, insights, and technical debt
- `docs/mcp-sdk-reference.md` - MCP SDK usage reference
- `server/CLAUDE.md` - Server-specific documentation
