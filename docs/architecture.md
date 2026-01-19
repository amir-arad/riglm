# RigLM Source Code Guide

A comprehensive navigation document for reviewing the `/data/Workspace/riglm/src` codebase from three perspectives.

---

## Quick Stats

| Metric                | Value                        |
| --------------------- | ---------------------------- |
| Total Files           | 42                           |
| Total Lines           | ~4,270                       |
| Circular Dependencies | 0                            |
| Orphan Modules        | 0                            |
| Architecture          | Hexagonal (Ports & Adapters) |

---

## 1. ENTRYPOINT & DEPENDENCY GRAPH

### 1.1 Bootstrap Sequence

**Process Start → Server Ready**

| Step | File                                       | Action                                         |
| ---- | ------------------------------------------ | ---------------------------------------------- |
| 1    | `src/index.ts`                             | Entry point, calls `main()`                    |
| 2    | `src/index.ts`                             | Register signal handlers (SIGINT, SIGTERM)     |
| 3    | `src/cli/index.ts`                         | `main()` parses argv                           |
| 4    | `src/cli/parse-args.ts`                    | `parseArgs()` routes to command parser         |
| 5    | `src/cli/config/resolved-config.ts`        | `resolveConfig()` merges CLI + env + defaults  |
| 6    | `src/application/bootstrap.ts`             | `startServer()` creates adapters               |
| 7    | `src/application/riglm-server.ts`          | `new RiglmServer(deps)` + `server.start()`     |
| 8    | Express `app.listen()`                     | **SERVER READY**                               |

### 1.2 Adapter Instantiation Order

| Order | Adapter                            | File                                               | Implements               |
| ----- | ---------------------------------- | -------------------------------------------------- | ------------------------ |
| 1     | `WinstonLoggerAdapter`             | `src/adapters/logging/winston.adapter.ts`          | `LoggerPort`             |
| 2     | `FileConfigAdapter`                | `src/adapters/storage/file-config.adapter.ts`      | `ConfiguratorPort`       |
| 3     | `McpClientAdapter`                 | `src/adapters/mcp/mcp-client.adapter.ts`           | `McpClientPort`          |
| 4     | `McpServerAdapter`                 | `src/adapters/mcp/mcp-server.adapter.ts`           | `McpServerPort`          |
| 5     | `TransportFactoryAdapter`          | `src/adapters/mcp/transports/transport-factory.adapter.ts` | `ClientTransportFactory` |

### 1.3 Service Factory Wiring

| Factory                       | File                                   | Creates                         | Lazy? |
| ----------------------------- | -------------------------------------- | ------------------------------- | ----- |
| `createSessionBackendFactory` | `src/application/backend.service.ts`   | `BackendConnection` per session | Yes   |
| `createHostsServiceFactory`   | `src/application/hosts.service.ts`     | `HostsService` per endpoint     | Yes   |
| `createConfigService`         | `src/application/config.service.ts`    | `ConfigService`                 | No    |

### 1.4 Dependency Graph

**Entrypoint Chain:**

```
index.ts
  └─ cli/index.ts
       ├─ cli/parse-args.ts
       ├─ cli/config/resolved-config.ts
       └─ application/bootstrap.ts
            ├─ adapters/logging/winston.adapter.ts
            ├─ adapters/storage/file-config.adapter.ts
            ├─ adapters/mcp/*.adapter.ts
            └─ application/riglm-server.ts
                 ├─ adapters/http/routes.ts
                 ├─ application/backend.service.ts
                 ├─ application/hosts.service.ts
                 └─ application/config.service.ts
```

**Domain Dependencies (no external deps):**

```
domain/error.ts ← (no imports)
domain/filter-engine.ts ← domain/config-resolver.ts
domain/config-resolver.ts ← (no domain imports)
domain/tool-aggregator.ts ← domain/config-resolver.ts, domain/filter-engine.ts
```

### 1.5 Shutdown Sequence

| Step | File                                           | Action                         |
| ---- | ---------------------------------------------- | ------------------------------ |
| 1    | `src/index.ts`                                 | `shutdown()` called by signal  |
| 2    | `src/application/bootstrap.ts`                 | Log shutdown, call `server.close()` |
| 3    | `src/application/riglm-server.ts`              | Close HTTP server              |
| 4    | `src/application/riglm-server.ts`              | `hostsServices.close()`        |
| 5    | `src/etc/closeable.ts`                         | Close all services in container |
| 6    | `src/application/transport-session-manager.ts` | Close sessions, clear intervals |
| 7    | `src/application/backend.service.ts`           | Close MCP clients              |

### 1.6 External Dependencies

| Package                       | Used In                                     | Purpose          |
| ----------------------------- | ------------------------------------------- | ---------------- |
| `express`                     | `src/application/riglm-server.ts`           | HTTP framework   |
| `helmet`                      | `src/application/riglm-server.ts`           | Security headers |
| `morgan`                      | `src/application/riglm-server.ts`           | HTTP logging     |
| `winston`                     | `src/adapters/logging/winston.adapter.ts`   | Logging          |
| `json5`                       | `src/cli/config/config-locator.ts`          | Config parsing   |
| `zod`                         | `src/domain/*.ts`                           | Validation       |
| `@modelcontextprotocol/sdk`   | `src/adapters/mcp/*.ts`                     | MCP protocol     |

---

## 2. USAGE FLOW (Request → Response)

### 2.1 Route Entry Points

| Route                          | File                                       | Protocol        | Purpose                |
| ------------------------------ | ------------------------------------------ | --------------- | ---------------------- |
| `GET /:endpointId/sse`         | `src/adapters/http/routes.ts`              | SSE             | Open MCP session       |
| `POST /:endpointId/messages`   | `src/adapters/http/routes.ts`              | HTTP            | Send MCP message (SSE) |
| `ALL /:endpointId/mcp`         | `src/adapters/http/routes.ts`              | HTTP Streamable | MCP over HTTP          |
| `GET /api/servers`             | `src/adapters/http/management.routes.ts`   | REST            | List servers           |
| `POST /api/servers`            | `src/adapters/http/management.routes.ts`   | REST            | Create server          |
| `GET /api/endpoints`           | `src/adapters/http/management.routes.ts`   | REST            | List endpoints         |
| `GET /api/status`              | `src/adapters/http/management.routes.ts`   | REST            | Health check           |

### 2.2 SSE Session Lifecycle

```
Client connects: GET /:endpointId/sse
```

| Step | File                                           | Action                                      |
| ---- | ---------------------------------------------- | ------------------------------------------- |
| 1    | `src/adapters/http/routes.ts`                  | Param middleware loads `hostsService`       |
| 2    | `src/adapters/http/routes.ts`                  | Create `SseServerTransportAdapter`          |
| 3    | `src/adapters/http/routes.ts`                  | `hostsService.createSession(transport)`     |
| 4    | `src/application/hosts.service.ts`             | Create transport session                    |
| 5    | `src/application/hosts.service.ts`             | Connect MCP server to transport             |
| 6    | `src/application/hosts.service.ts`             | Create host session (lazy)                  |
| 7    | `src/adapters/http/routes.ts`                  | Send `event: session` + `event: endpoint`   |

### 2.3 Host Session Creation (First Request)

| Step | File                                     | Action                                     |
| ---- | ---------------------------------------- | ------------------------------------------ |
| 1    | `src/application/hosts.service.ts`       | Connect to backend servers                 |
| 2    | `src/application/backend.service.ts`     | For each server: create transport + client |
| 3    | `src/application/backend.service.ts`     | Select transport type (stdio/HTTP/SSE)     |
| 4    | `src/application/backend.service.ts`     | `connectWithRetry()` with 3 attempts       |
| 5    | `src/application/backend.service.ts`     | `client.listTools()`                       |
| 6    | `src/application/hosts.service.ts`       | `ToolAggregator.aggregateTools()`          |
| 7    | `src/application/hosts.service.ts`       | Build `toolHandlers` map                   |

### 2.4 Tool Aggregation & Filtering

| Step | File                              | Action                                                           |
| ---- | --------------------------------- | ---------------------------------------------------------------- |
| 1    | `src/domain/tool-aggregator.ts`   | `aggregateTools()` iterates servers                              |
| 2    | `src/domain/tool-aggregator.ts`   | `namespace()`: `github` + `search_code` → `github-search_code`   |
| 3    | `src/domain/filter-engine.ts`     | `shouldFilter()` checks glob patterns                            |
| 4    | `src/domain/tool-aggregator.ts`   | Skip if filtered                                                 |
| 5    | `src/domain/tool-aggregator.ts`   | Add to aggregated list with description                          |

### 2.5 MCP List Tools Flow

```
Client sends: tools/list
```

| Step | File                                      | Action                            |
| ---- | ----------------------------------------- | --------------------------------- |
| 1    | Transport receives message                | (MCP SDK internal)                |
| 2    | `src/adapters/mcp/mcp-server.adapter.ts`  | SDK handler invoked               |
| 3    | `src/adapters/mcp/mcp-server.adapter.ts`  | Extract sessionId, check abort    |
| 4    | `src/application/hosts.service.ts`        | Application handler               |
| 5    | `src/application/hosts.service.ts`        | Get host session from container   |
| 6    | `src/application/hosts.service.ts`        | Return `{ tools: session.tools }` |

### 2.6 MCP Call Tool Flow

```
Client sends: tools/call { name: "github-search_code", arguments: {...} }
```

| Step | File                                      | Action                                                 |
| ---- | ----------------------------------------- | ------------------------------------------------------ |
| 1    | `src/adapters/mcp/mcp-server.adapter.ts`  | SDK handler invoked                                    |
| 2    | `src/application/hosts.service.ts`        | Application handler                                    |
| 3    | `src/application/hosts.service.ts`        | Get host session                                       |
| 4    | `src/application/hosts.service.ts`        | Lookup handler: `toolHandlers.get("github-search_code")` |
| 5    | `src/application/hosts.service.ts`        | Handler calls backend                                  |
| 6    | `src/adapters/mcp/mcp-client.adapter.ts`  | `client.callTool()`                                    |
| 7    | Downstream MCP server executes            | (External)                                             |
| 8    | Response returned through layers          |                                                        |

### 2.7 State Management

| Scope    | Container            | File                                           | Contents                        |
| -------- | -------------------- | ---------------------------------------------- | ------------------------------- |
| Global   | `hostsServices`      | `src/application/riglm-server.ts`              | HostsService per endpoint       |
| Endpoint | `hostSessions`       | `src/application/hosts.service.ts`             | HostSession per session         |
| Session  | `backends`           | `src/application/hosts.service.ts`             | BackendConnection per server    |
| Session  | `TransportSession`   | `src/application/transport-session-manager.ts` | Transport + services + metadata |

### 2.8 Session Cleanup

| Trigger             | File                                           | Action                 |
| ------------------- | ---------------------------------------------- | ---------------------- |
| Client disconnect   | `src/adapters/http/routes.ts`                  | Abort controller fires |
| Inactivity (30 min) | `src/application/transport-session-manager.ts` | Background cleanup job |
| Server shutdown     | `src/application/transport-session-manager.ts` | Close all sessions     |

---

## 3. ABSTRACTION LAYERS

### 3.1 Directory Structure

```
src/
├── ports/           # Layer 1: Interfaces (5 files, ~184 lines)
├── domain/          # Layer 2: Business Logic (4 files, ~388 lines)
├── application/     # Layer 3: Use Cases (6 files, ~1,472 lines)
├── adapters/        # Layer 4: Infrastructure (13 files, ~1,173 lines)
│   ├── http/        #   Express routes & middleware (3 files)
│   ├── mcp/         #   MCP SDK wrappers (2 files)
│   │   └── transports/  #   Transport implementations (6 files)
│   ├── storage/     #   File persistence (1 file)
│   └── logging/     #   Winston (1 file)
├── cli/             # CLI entrypoint (7 files, ~803 lines)
│   ├── config/      #   Config resolution (3 files)
│   └── output/      #   Banner, help, version (4 files)
├── etc/             # Utilities (2 files, ~134 lines)
├── embedded-assets.ts  # Standalone binary asset embedding
└── index.ts         # Process entrypoint
```

### 3.2 Layer Dependencies (Allowed)

```
Ports    ← (nothing, only defines interfaces)
Domain   ← Ports (types only), Zod
Application ← Ports, Domain
Adapters ← Ports, Domain, External libs
CLI      ← All (composition root)
```

### 3.3 Ports Layer (5 files, 184 lines)

| File                                 | Lines | Exports                                            | Purpose               |
| ------------------------------------ | ----- | -------------------------------------------------- | --------------------- |
| `src/ports/logger.port.ts`           | 11    | `LoggerPort`                                       | Logging abstraction   |
| `src/ports/config-storage.port.ts`   | 15    | `ConfigStoratorPort`, `ConfiguratorPort`           | Config persistence    |
| `src/ports/mcp-client.port.ts`       | 32    | `McpClientPort`, `McpClientFactory`                | MCP client operations |
| `src/ports/mcp-server.port.ts`       | 52    | `McpServerPort`, `McpServerFactory`                | MCP server operations |
| `src/ports/transport.port.ts`        | 74    | `TransportPort`, `SdkTransportPort`, factories     | Transport abstraction |

### 3.4 Domain Layer (4 files, 388 lines)

| File                              | Lines | Exports                                  | Purpose                       |
| --------------------------------- | ----- | ---------------------------------------- | ----------------------------- |
| `src/domain/filter-engine.ts`     | 42    | `FilterEngine`                           | Glob pattern matching         |
| `src/domain/error.ts`             | 66    | `ApiError`                               | Typed errors with HTTP status |
| `src/domain/tool-aggregator.ts`   | 124   | `ToolAggregator`                         | Namespacing & aggregation     |
| `src/domain/config-resolver.ts`   | 156   | `ConfigResolver`, `validateConfig`, Zod schemas | Config access with priority   |

### 3.5 Application Layer (6 files, 1,472 lines)

| File                                           | Lines | Exports                                          | Purpose                      |
| ---------------------------------------------- | ----- | ------------------------------------------------ | ---------------------------- |
| `src/application/bootstrap.ts`                 | 67    | `startServer`                                    | Server initialization        |
| `src/application/riglm-server.ts`              | 189   | `RiglmServer`                                    | Express app, composition root |
| `src/application/hosts.service.ts`             | 208   | `createHostsServiceFactory`, `HostsService`      | Tool aggregation, MCP server |
| `src/application/backend.service.ts`           | 231   | `createSessionBackendFactory`, `BackendConnection` | MCP client connections     |
| `src/application/transport-session-manager.ts` | 240   | `TransportSessionManager`                        | Session lifecycle, cleanup   |
| `src/application/config.service.ts`            | 537   | `ConfigService`                                  | REST API CRUD                |

### 3.6 Adapters Layer (13 files, ~1,173 lines)

**HTTP Adapters (3 files, 409 lines):**

| File                                       | Lines | Exports              |
| ------------------------------------------ | ----- | -------------------- |
| `src/adapters/http/error.middleware.ts`    | 57    | `errorHandler`       |
| `src/adapters/http/management.routes.ts`   | 149   | `makeManagementRoutes` |
| `src/adapters/http/routes.ts`              | 203   | `makeHostsRoutes`    |

**MCP Adapters (2 files, 175 lines):**

| File                                      | Lines | Implements      |
| ----------------------------------------- | ----- | --------------- |
| `src/adapters/mcp/mcp-client.adapter.ts`  | 63    | `McpClientPort` |
| `src/adapters/mcp/mcp-server.adapter.ts`  | 112   | `McpServerPort` |

**Transport Adapters (6 files, 337 lines):**

| File                                                       | Lines | Implements                  |
| ---------------------------------------------------------- | ----- | --------------------------- |
| `src/adapters/mcp/transports/transport-factory.adapter.ts` | 34    | `ClientTransportFactory`    |
| `src/adapters/mcp/transports/sse-server.adapter.ts`        | 55    | `TransportPort`             |
| `src/adapters/mcp/transports/http-client.adapter.ts`       | 57    | `SdkTransportPort`          |
| `src/adapters/mcp/transports/stdio-client.adapter.ts`      | 60    | `SdkTransportPort`          |
| `src/adapters/mcp/transports/http-server.adapter.ts`       | 65    | `HttpServerTransportPort`   |
| `src/adapters/mcp/transports/sse-client.adapter.ts`        | 66    | `SdkTransportPort`          |

**Storage & Logging (2 files, 252 lines):**

| File                                            | Lines | Implements         |
| ----------------------------------------------- | ----- | ------------------ |
| `src/adapters/storage/file-config.adapter.ts`   | 82    | `ConfiguratorPort` |
| `src/adapters/logging/winston.adapter.ts`       | 170   | `LoggerPort`       |

### 3.7 CLI Layer (7 files, 803 lines)

| File                                   | Lines | Purpose                    |
| -------------------------------------- | ----- | -------------------------- |
| `src/cli/index.ts`                     | 223   | Main CLI entry, commands   |
| `src/cli/parse-args.ts`                | 102   | Argument parsing           |
| `src/cli/version.macro.ts`             | 20    | Build-time version         |
| `src/cli/config/args.schema.ts`        | 44    | CLI argument schemas       |
| `src/cli/config/config-locator.ts`     | 115   | Config file discovery      |
| `src/cli/config/resolved-config.ts`    | 107   | Config merging             |
| `src/cli/output/banner.ts`             | 109   | Startup banner             |
| `src/cli/output/help.ts`               | 38    | Help text                  |
| `src/cli/output/version.ts`            | 27    | Version display            |
| `src/cli/output/exit-codes.ts`         | 18    | Exit code constants        |

### 3.8 Utilities (2 files, 134 lines)

| Concern            | File                    | Lines | Purpose                    |
| ------------------ | ----------------------- | ----- | -------------------------- |
| Service Container  | `src/etc/closeable.ts`  | 84    | Lifecycle management       |
| Environment        | `src/etc/env.ts`        | 50    | Environment variable utils |

### 3.9 Validation Strategy

| Layer          | Validation Method        | File                              |
| -------------- | ------------------------ | --------------------------------- |
| Config Load    | `validateConfig()`       | `src/domain/config-resolver.ts`   |
| API Input      | Zod discriminated unions | `src/application/config.service.ts` |
| Error Response | `ApiError` class         | `src/domain/error.ts`             |

---

## Key Files for Deep Review

| Priority | File                                           | Why                                  |
| -------- | ---------------------------------------------- | ------------------------------------ |
| 1        | `src/domain/config-resolver.ts`                | Config schemas, validation           |
| 2        | `src/application/hosts.service.ts`             | Core orchestration, tool aggregation |
| 3        | `src/application/backend.service.ts`           | MCP client management                |
| 4        | `src/application/riglm-server.ts`              | Composition root, dependency wiring  |
| 5        | `src/domain/tool-aggregator.ts`                | Namespacing logic                    |
| 6        | `src/domain/filter-engine.ts`                  | Filter pattern matching              |
| 7        | `src/application/transport-session-manager.ts` | Session lifecycle                    |
| 8        | `src/adapters/http/routes.ts`                  | HTTP entry points                    |

---

## Generate Visual Dependency Graph

```bash
# Full dependency graph (SVG)
npx madge --ts-config tsconfig.json src/ --image deps.svg

# From entrypoint only
npx madge --ts-config tsconfig.json src/index.ts --image entrypoint.svg

# Check for issues
npx madge --ts-config tsconfig.json src/ --circular
npx madge --ts-config tsconfig.json src/ --orphans
```
