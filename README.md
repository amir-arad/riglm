# RigLM - An AI Extension Manager

A unified platform that aggregates multiple MCP (Model Context Protocol) servers into a single endpoint. Define your LLM extensions in one place, then connect from any MCP-compatible client (Claude Code, Cursor, Cline, etc.).

## Features

- **MCP Server Aggregation** - Combine multiple MCP servers (local or remote) into unified endpoints
- **Tool Namespacing** - Tools are automatically prefixed with server names (`github-list_repos`) to avoid conflicts
- **Flexible Configuration** - JSON5 config with support for local (stdio) and remote (SSE/HTTP) servers
- **Tool Filtering** - Filter out unwanted tools at global, endpoint, or server level
- **Multiple Endpoints** - Create different endpoints for different use cases (development, production, etc.)
- **Web UI** - React-based dashboard for monitoring and management

## Installation

### Standalone Binary (Recommended)

Build a single executable with embedded web client (no Bun or Node.js runtime required):

```bash
cd server
bun install
bun run build:standalone
```

This creates `dist/riglm` (~102MB) with all dependencies and assets embedded.

**Install system-wide:**

```bash
sudo cp dist/riglm /usr/local/bin/
sudo chmod +x /usr/local/bin/riglm
```

Or add to your PATH:

```bash
mkdir -p ~/.local/bin
cp dist/riglm ~/.local/bin/
chmod +x ~/.local/bin/riglm
# Add to ~/.bashrc or ~/.zshrc: export PATH="$HOME/.local/bin:$PATH"
```

### Initial Setup

Create a configuration file:

```bash
# Global config in ~/.config/riglm/
riglm init

# Or local config in ./.riglm/ (project-specific)
riglm init --local
```

Template options:

- `minimal` (default) - Basic starter config
- `standard` - Common server setup
- `full` - All options with comments

```bash
riglm init --template standard
```

Edit the generated `config.json5` to add your MCP servers.

### Running

```bash
# Start the server (uses config from ~/.config/riglm/ or ./.riglm/)
riglm serve

# Or simply (serve is the default command)
riglm

# Custom port and verbose logging
riglm serve -p 8080 -v

# Show all available options
riglm help
```

### Validate Configuration

```bash
riglm validate
riglm validate -c /path/to/config.json5
```

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
cd riglm
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

| Endpoint                             | Method | Description                             |
| ------------------------------------ | ------ | --------------------------------------- |
| `/:endpointId/sse`                 | GET    | SSE endpoint for MCP client connections |
| `/:endpointId/messages/:sessionId` | POST   | MCP message handling                    |
| `/:endpointId/status`              | GET    | Health check for specific endpoint      |

## Environment Variables

| Variable        | Default                       | Description                              |
| --------------- | ----------------------------- | ---------------------------------------- |
| `CONFIG_PATH` | `./data/config.local.json5` | Path to configuration file               |
| `PORT`        | `3000`                      | Server port                              |
| `LOG_LEVEL`   | `info`                      | Logging level (error, warn, info, debug) |
| `NODE_ENV`    | `development`               | Environment mode                         |

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

## Development Workflow

This project uses GitHub Actions for CI/CD with automated testing, building, and releasing.

### Continuous Integration

On every push and PR to `main`, GitHub Actions runs:

| Check | Command | Description |
|-------|---------|-------------|
| Type Check | `bun run typecheck` | TypeScript compilation |
| Lint | `bun run lint` | ESLint code quality |
| Test | `bun test` | Unit and integration tests |
| Build | `bun run build:standalone` | Verify standalone builds |

### Version Management

Version management uses npm's built-in versioning which automatically:
- Runs pre-version checks (lint, typecheck, tests)
- Updates `package.json` version
- Creates a git commit with the version
- Creates a git tag (e.g., `v1.2.3`)
- Pushes the commit and tag to origin

**Release commands** (run from `server/` directory):

```bash
# Patch release (1.0.0 → 1.0.1) - bug fixes
bun run release:patch

# Minor release (1.0.0 → 1.1.0) - new features, backward compatible
bun run release:minor

# Major release (1.0.0 → 2.0.0) - breaking changes
bun run release:major
```

**Manual version control:**

```bash
# Set specific version
npm version 2.0.0-beta.1

# Prerelease versions
npm version prerelease --preid=beta  # 1.0.0 → 1.0.1-beta.0
npm version prerelease --preid=rc    # 1.0.0 → 1.0.1-rc.0
```

### Release Process

When a version tag is pushed (e.g., `v1.2.3`), GitHub Actions automatically:

1. **Builds** standalone executables for all platforms:
   - `riglm-linux-x64.tar.gz` - Linux (Intel/AMD)
   - `riglm-linux-arm64.tar.gz` - Linux (ARM)
   - `riglm-darwin-x64.tar.gz` - macOS (Intel)
   - `riglm-darwin-arm64.tar.gz` - macOS (Apple Silicon)
   - `riglm-windows-x64.zip` - Windows

2. **Creates** a GitHub Release with:
   - All platform binaries attached
   - Auto-generated release notes from commits

### Complete Release Example

```bash
# 1. Ensure you're on main with latest changes
git checkout main
git pull origin main

# 2. Run release (from server/ directory)
cd server
bun run release:minor  # or release:patch, release:major

# This automatically:
# - Runs lint, typecheck, and tests
# - Bumps version in package.json (e.g., 1.0.0 → 1.1.0)
# - Commits: "1.1.0"
# - Tags: "v1.1.0"
# - Pushes commit and tag to origin
# - Triggers GitHub Actions release workflow

# 3. Monitor the release
# Go to GitHub Actions to watch the build
# Once complete, binaries are available at:
# https://github.com/<owner>/riglm/releases/latest
```

### Downloading Releases

Users can download pre-built binaries from the [Releases page](../../releases):

```bash
# Linux (x64)
curl -L https://github.com/<owner>/riglm/releases/latest/download/riglm-linux-x64.tar.gz | tar xz
chmod +x riglm-linux-x64
sudo mv riglm-linux-x64 /usr/local/bin/riglm

# macOS (Apple Silicon)
curl -L https://github.com/<owner>/riglm/releases/latest/download/riglm-darwin-arm64.tar.gz | tar xz
chmod +x riglm-darwin-arm64
sudo mv riglm-darwin-arm64 /usr/local/bin/riglm

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/<owner>/riglm/releases/latest/download/riglm-windows-x64.zip" -OutFile riglm.zip
Expand-Archive riglm.zip -DestinationPath .
# Add to PATH or move to desired location
```

## Project Structure

```
riglm/
├── server/                 # Express backend (hexagonal architecture)
│   ├── src/
│   │   ├── index.ts        # Entry point (wires adapters)
│   │   ├── server.ts       # RiglmServer (Express app)
│   │   ├── ports/          # Abstract interfaces (contracts)
│   │   ├── domain/         # Pure business logic (filter, types, config)
│   │   ├── adapters/       # Concrete implementations
│   │   │   ├── http/       # Express routes & middleware
│   │   │   ├── logging/    # Winston adapter
│   │   │   ├── storage/    # File config adapter
│   │   │   └── mcp/        # MCP client/server adapters
│   │   ├── application/    # Services (hosts, backend)
│   │   ├── host-gateway/   # Transport session manager
│   │   └── etc/            # Utilities
│   └── test/               # Test files
├── client/                 # React frontend (placeholder, Phase 4)
│   ├── src/
│   │   ├── pages/          # Dashboard, Servers, Endpoints, etc.
│   │   └── components/     # UI components (shadcn/ui)
│   └── index.html
├── docs/                   # Documentation and plans
└── README.md
```

## License

ISC
