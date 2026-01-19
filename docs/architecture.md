# RiglM Source Code Guide

A comprehensive navigation document for reviewing the `/data/Workspace/riglm/src` codebase from three perspectives.

---

## Quick Stats

| Metric                | Value                        |
| --------------------- | ---------------------------- |
| Total Files           | 45+                          |
| Total Lines           | ~3,900                       |
| Circular Dependencies | 0                            |
| Orphan Modules        | 0                            |
| Architecture          | Hexagonal (Ports & Adapters) |

---

## 1. ENTRYPOINT & DEPENDENCY GRAPH

### 1.1 Bootstrap Sequence

**Process Start → Server Ready**

| Step | File:Line                                     | Action                                                        |
| ---- | --------------------------------------------- | ------------------------------------------------------------- |
| 1    | `src/index.ts:38`                           | Call `main()`                                               |
| 2    | `src/index.ts:18-36`                        | Register signal handlers (SIGINT, SIGTERM, uncaughtException) |
| 3    | `src/cli/index.ts:253-262`                  | `main()` parses argv                                        |
| 4    | `src/cli/index.ts:34-68`                    | `parseArgs()` routes to command parser                      |
| 5    | `src/cli/index.ts:73-116`                   | `parseServeArgs()` extracts CLI flags                       |
| 6    | `src/cli/commands/serve.command.ts:144-192` | `serveCommand()` orchestrates startup                       |
| 7    | `src/cli/config/resolved-config.ts:102-149` | `resolveConfig()` merges CLI + env + defaults               |
| 8    | `src/cli/commands/serve.command.ts:36-72`   | `loadConfigFile()` parses JSON5 + validates                 |
| 9    | `src/cli/commands/serve.command.ts:77-134`  | `startServer()` creates adapters                            |
| 10   | `src/server.ts:104-117`                     | `new RiglmServer(deps)`                                     |
| 11   | `src/server.ts:71-172`                      | `server.start()` wires factories + Express                  |
| 12   | `src/server.ts:162-165`                     | `app.listen()` → **SERVER READY**                    |

### 1.2 Adapter Instantiation Order

| Order | Adapter                           | File:Line                                               | Implements                 |
| ----- | --------------------------------- | ------------------------------------------------------- | -------------------------- |
| 1     | `WinstonLoggerAdapter`          | `src/adapters/logging/winston.adapter.ts:204-207`     | `LoggerPort`             |
| 2     | `FileConfigAdapter`             | `src/adapters/storage/file-config.adapter.ts:109-114` | `ConfiguratorPort`       |
| 3     | `McpClientFactoryAdapter`       | `src/adapters/mcp/mcp-client.adapter.ts:85`           | `McpClientFactory`       |
| 4     | `McpServerFactoryAdapter`       | `src/adapters/mcp/mcp-server.adapter.ts:85`           | `McpServerFactory`       |
| 5     | `ClientTransportFactoryAdapter` | `src/adapters/mcp/transports/index.ts:45`             | `ClientTransportFactory` |

### 1.3 Service Factory Wiring

```
src/server.ts:71-172 (start method)
```

| Factory                         | File:Line                                     | Creates                           | Lazy? |
| ------------------------------- | --------------------------------------------- | --------------------------------- | ----- |
| `createSessionBackendFactory` | `src/application/backend.service.ts:62-70`  | `BackendConnection` per session | Yes   |
| `createHostsServiceFactory`   | `src/application/hosts.service.ts:61-67`    | `HostsService` per endpoint     | Yes   |
| `createConfigService`         | `src/application/config.service.ts:641-643` | `ConfigService`                 | No    |

### 1.4 Dependency Graph (Madge Output)

**Entrypoint Chain:**

```
index.ts
  └─ cli/index.ts
       └─ cli/commands/serve.command.ts
            ├─ adapters/logging/winston.adapter.ts
            ├─ adapters/storage/file-config.adapter.ts
            ├─ adapters/mcp/*.adapter.ts
            └─ server.ts
                 ├─ adapters/http/routes.ts
                 ├─ application/backend.service.ts
                 ├─ application/hosts.service.ts
                 └─ application/config.service.ts
```

**Domain Dependencies (no external deps):**

```
domain/types.ts ← (no imports)
domain/error.ts ← (no imports)
domain/filter-engine.ts ← domain/types.ts
domain/config-resolver.ts ← domain/types.ts
domain/tool-aggregator.ts ← domain/types.ts, domain/filter-engine.ts
```

### 1.5 Shutdown Sequence

| Step | File:Line                                                 | Action                                |
| ---- | --------------------------------------------------------- | ------------------------------------- |
| 1    | `src/index.ts:7-16`                                     | `shutdown()` called by signal       |
| 2    | `src/index.ts:10`                                       | `runtime.close()`                   |
| 3    | `src/cli/commands/serve.command.ts:129-132`             | Log shutdown, call `server.close()` |
| 4    | `src/server.ts:174-194`                                 | Close HTTP server                     |
| 5    | `src/server.ts:193`                                     | `hostsServices.close()`             |
| 6    | `src/etc/service.ts:26-39`                              | Close all services in container       |
| 7    | `src/host-gateway/transport-session-manager.ts:188-229` | Close sessions, clear intervals       |
| 8    | `src/application/backend.service.ts:150-154`            | Close MCP clients                     |

### 1.6 External Dependencies

| Package                       | Used In                                       | Purpose          |
| ----------------------------- | --------------------------------------------- | ---------------- |
| `express`                   | `src/server.ts:5`                           | HTTP framework   |
| `helmet`                    | `src/server.ts:6`                           | Security headers |
| `morgan`                    | `src/server.ts:8`                           | HTTP logging     |
| `winston`                   | `src/adapters/logging/winston.adapter.ts:5` | Logging          |
| `json5`                     | `src/cli/commands/serve.command.ts:9`       | Config parsing   |
| `zod`                       | `src/domain/*.ts`                           | Validation       |
| `@modelcontextprotocol/sdk` | `src/adapters/mcp/*.ts`                     | MCP protocol     |

---

## 2. USAGE FLOW (Request → Response)

### 2.1 Route Entry Points

| Route                          | File:Line                                      | Protocol        | Purpose                |
| ------------------------------ | ---------------------------------------------- | --------------- | ---------------------- |
| `GET /:endpointId/sse`       | `src/adapters/http/routes.ts:39-78`          | SSE             | Open MCP session       |
| `POST /:endpointId/messages` | `src/adapters/http/routes.ts:80-87`          | HTTP            | Send MCP message (SSE) |
| `ALL /:endpointId/mcp`       | `src/adapters/http/routes.ts:90-143`         | HTTP Streamable | MCP over HTTP          |
| `GET /api/servers`           | `src/adapters/http/management.routes.ts:30`  | REST            | List servers           |
| `POST /api/servers`          | `src/adapters/http/management.routes.ts:35`  | REST            | Create server          |
| `GET /api/endpoints`         | `src/adapters/http/management.routes.ts:79`  | REST            | List endpoints         |
| `GET /api/status`            | `src/adapters/http/management.routes.ts:118` | REST            | Health check           |

### 2.2 SSE Session Lifecycle

```
Client connects: GET /:endpointId/sse
```

| Step | File:Line                                    | Action                                        |
| ---- | -------------------------------------------- | --------------------------------------------- |
| 1    | `src/adapters/http/routes.ts:20-32`        | Param middleware loads `hostsService`       |
| 2    | `src/adapters/http/routes.ts:46-50`        | Create `SseServerTransportAdapter`          |
| 3    | `src/adapters/http/routes.ts:51-54`        | `hostsService.createSession(transport)`     |
| 4    | `src/application/hosts.service.ts:189-208` | Create transport session                      |
| 5    | `src/application/hosts.service.ts:198`     | Connect MCP server to transport               |
| 6    | `src/application/hosts.service.ts:202`     | Create host session (lazy)                    |
| 7    | `src/adapters/http/routes.ts:56-58`        | Send `event: session` + `event: endpoint` |

### 2.3 Host Session Creation (First Request)

```
src/application/hosts.service.ts:130-181
```

| Step | File:Line                                     | Action                                     |
| ---- | --------------------------------------------- | ------------------------------------------ |
| 1    | `src/application/hosts.service.ts:134-140`  | Connect to backend servers                 |
| 2    | `src/application/backend.service.ts:82-155` | For each server: create transport + client |
| 3    | `src/application/backend.service.ts:99-105` | Select transport type (stdio/HTTP/SSE)     |
| 4    | `src/application/backend.service.ts:115`    | `connectWithRetry()` with 3 attempts     |
| 5    | `src/application/backend.service.ts:121`    | `client.listTools()`                     |
| 6    | `src/application/hosts.service.ts:143-149`  | `ToolAggregator.aggregateTools()`        |
| 7    | `src/application/hosts.service.ts:151-171`  | Build `toolHandlers` map                 |

### 2.4 Tool Aggregation & Filtering

| Step | File:Line                               | Action                                                                  |
| ---- | --------------------------------------- | ----------------------------------------------------------------------- |
| 1    | `src/domain/tool-aggregator.ts:50-77` | `aggregateTools()` iterates servers                                   |
| 2    | `src/domain/tool-aggregator.ts:20-23` | `namespace()`: `github` + `search_code` → `github-search_code` |
| 3    | `src/domain/filter-engine.ts:28-44`   | `shouldFilter()` checks glob patterns                                 |
| 4    | `src/domain/tool-aggregator.ts:63-65` | Skip if filtered                                                        |
| 5    | `src/domain/tool-aggregator.ts:68-75` | Add to aggregated list with description                                 |

### 2.5 MCP List Tools Flow

```
Client sends: tools/list
```

| Step | File:Line                                        | Action                              |
| ---- | ------------------------------------------------ | ----------------------------------- |
| 1    | Transport receives message                       | (MCP SDK internal)                  |
| 2    | `src/adapters/mcp/mcp-server.adapter.ts:52-66` | SDK handler invoked                 |
| 3    | `src/adapters/mcp/mcp-server.adapter.ts:57-62` | Extract sessionId, check abort      |
| 4    | `src/application/hosts.service.ts:211-214`     | Application handler                 |
| 5    | `src/application/hosts.service.ts:212`         | Get host session from container     |
| 6    | `src/application/hosts.service.ts:213`         | Return `{ tools: session.tools }` |

### 2.6 MCP Call Tool Flow

```
Client sends: tools/call { name: "github-search_code", arguments: {...} }
```

| Step | File:Line                                        | Action                                                    |
| ---- | ------------------------------------------------ | --------------------------------------------------------- |
| 1    | `src/adapters/mcp/mcp-server.adapter.ts:69-91` | SDK handler invoked                                       |
| 2    | `src/application/hosts.service.ts:216-225`     | Application handler                                       |
| 3    | `src/application/hosts.service.ts:218`         | Get host session                                          |
| 4    | `src/application/hosts.service.ts:219`         | Lookup handler:`toolHandlers.get("github-search_code")` |
| 5    | `src/application/hosts.service.ts:156-169`     | Handler calls backend                                     |
| 6    | `src/adapters/mcp/mcp-client.adapter.ts:51-59` | `client.callTool()`                                     |
| 7    | Downstream MCP server executes                   | (External)                                                |
| 8    | Response returned through layers                 |                                                           |

### 2.7 State Management

| Scope    | Container            | File:Line                                                | Contents                        |
| -------- | -------------------- | -------------------------------------------------------- | ------------------------------- |
| Global   | `hostsServices`    | `src/server.ts:83-88`                                  | HostsService per endpoint       |
| Endpoint | `hostSessions`     | `src/application/hosts.service.ts:109`                 | HostSession per session         |
| Session  | `backends`         | `src/application/hosts.service.ts:132`                 | BackendConnection per server    |
| Session  | `TransportSession` | `src/host-gateway/transport-session-manager.ts:40-107` | Transport + services + metadata |

### 2.8 Session Cleanup

| Trigger             | File:Line                                                 | Action                 |
| ------------------- | --------------------------------------------------------- | ---------------------- |
| Client disconnect   | `src/adapters/http/routes.ts:59-62`                     | Abort controller fires |
| Inactivity (30 min) | `src/host-gateway/transport-session-manager.ts:157-175` | Background cleanup job |
| Server shutdown     | `src/host-gateway/transport-session-manager.ts:234-236` | Close all sessions     |

---

## 3. ABSTRACTION LAYERS

### 3.1 Directory Structure

```
src/
├── ports/           # Layer 1: Interfaces (7 files, ~500 lines)
├── domain/          # Layer 2: Business Logic (7 files, ~920 lines)
├── application/     # Layer 3: Use Cases (3 files, ~1,200 lines)
├── adapters/        # Layer 4: Infrastructure (20+ files, ~850 lines)
│   ├── http/        #   Express routes & middleware
│   ├── mcp/         #   MCP SDK wrappers
│   │   └── transports/  #   Transport implementations
│   ├── storage/     #   File persistence
│   └── logging/     #   Winston
├── host-gateway/    # Cross-cutting: Session management
├── etc/             # Utilities: Service container
├── cli/             # CLI entrypoint (separate concern)
├── server.ts        # Composition root
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

### 3.3 Ports Layer

| File                                    | Lines | Exports                                            | Purpose               |
| --------------------------------------- | ----- | -------------------------------------------------- | --------------------- |
| `src/ports/logger.port.ts`            | 38    | `LoggerPort`                                     | Logging abstraction   |
| `src/ports/config-storage.port.ts`    | 54    | `ConfigStoratorPort`, `ConfiguratorPort`       | Config persistence    |
| `src/ports/mcp-client.port.ts`        | 90    | `McpClientPort`, `McpClientFactory`            | MCP client operations |
| `src/ports/mcp-server.port.ts`        | 112   | `McpServerPort`, `McpServerFactory`            | MCP server operations |
| `src/ports/transport.port.ts`         | 166   | `TransportPort`, `SdkTransportPort`, factories | Transport abstraction |

### 3.4 Domain Layer

| File                              | Lines | Exports                                                      | Purpose                       |
| --------------------------------- | ----- | ------------------------------------------------------------ | ----------------------------- |
| `src/domain/types.ts`           | 175   | Zod schemas,`Config`, `ServerConfig`, `ToolDefinition` | Domain models                 |
| `src/domain/error.ts`           | 114   | `ApiError`                                                 | Typed errors with HTTP status |
| `src/domain/filter-engine.ts`   | 72    | `FilterEngine`                                             | Glob pattern matching         |
| `src/domain/tool-aggregator.ts` | 103   | `ToolAggregator`                                           | Namespacing & aggregation     |
| `src/domain/config-resolver.ts` | 165   | `ConfigResolver`, `validateConfig`                       | Config access with priority   |

### 3.5 Application Layer

| File                                   | Lines | Exports                                                | Purpose                      |
| -------------------------------------- | ----- | ------------------------------------------------------ | ---------------------------- |
| `src/application/backend.service.ts` | 285   | `createSessionBackendFactory`, `BackendConnection` | MCP client connections       |
| `src/application/hosts.service.ts`   | 245   | `createHostsServiceFactory`, `HostsService`        | Tool aggregation, MCP server |
| `src/application/config.service.ts`  | 658   | `ConfigService`                                      | REST API CRUD                |

### 3.6 Adapters Layer

**HTTP Adapters:**

| File                                       | Lines | Exports                  |
| ------------------------------------------ | ----- | ------------------------ |
| `src/adapters/http/routes.ts`            | 202   | `makeHostsRoutes`      |
| `src/adapters/http/management.routes.ts` | 221   | `makeManagementRoutes` |
| `src/adapters/http/error.middleware.ts`  | 15    | `errorHandler`         |

**MCP Adapters:**

| File                                                    | Lines | Implements                  |
| ------------------------------------------------------- | ----- | --------------------------- |
| `src/adapters/mcp/mcp-client.adapter.ts`              | 86    | `McpClientPort`           |
| `src/adapters/mcp/mcp-server.adapter.ts`              | 132   | `McpServerPort`           |
| `src/adapters/mcp/transports/stdio-client.adapter.ts` | 45    | `SdkTransportPort`        |
| `src/adapters/mcp/transports/sse-client.adapter.ts`   | 35    | `SdkTransportPort`        |
| `src/adapters/mcp/transports/http-client.adapter.ts`  | 30    | `SdkTransportPort`        |
| `src/adapters/mcp/transports/http-server.adapter.ts`  | 55    | `HttpServerTransportPort` |
| `src/adapters/mcp/transports/sse-server.adapter.ts`   | 70    | `TransportPort`           |

**Storage & Logging:**

| File                                            | Lines | Implements           |
| ----------------------------------------------- | ----- | -------------------- |
| `src/adapters/storage/file-config.adapter.ts` | 114   | `ConfiguratorPort` |
| `src/adapters/logging/winston.adapter.ts`     | 207   | `LoggerPort`       |

### 3.7 Cross-Cutting Concerns

| Concern            | File                                              | Lines | Purpose                    |
| ------------------ | ------------------------------------------------- | ----- | -------------------------- |
| Service Container  | `src/etc/service.ts`                            | 104   | Lifecycle management       |
| Session Management | `src/host-gateway/transport-session-manager.ts` | 237   | Session lifecycle, cleanup |

### 3.8 Validation Strategy

| Layer          | Validation Method        | File:Line                                    |
| -------------- | ------------------------ | -------------------------------------------- |
| Config Load    | `validateConfig()`     | `src/domain/config-resolver.ts:23-57`      |
| API Input      | Zod discriminated unions | `src/application/config.service.ts:25-120` |
| Runtime        | Type guards              | `src/domain/types.ts:85-92`                |
| Error Response | `ApiError` class       | `src/domain/error.ts:1-114`                |
---

## Key Files for Deep Review

| Priority | File                                              | Why                                  |
| -------- | ------------------------------------------------- | ------------------------------------ |
| 1        | `src/domain/types.ts`                           | All domain models, Zod schemas       |
| 2        | `src/application/hosts.service.ts`              | Core orchestration, tool aggregation |
| 3        | `src/application/backend.service.ts`            | MCP client management                |
| 4        | `src/server.ts`                                 | Composition root, dependency wiring  |
| 5        | `src/domain/tool-aggregator.ts`                 | Namespacing logic                    |
| 6        | `src/domain/filter-engine.ts`                   | Filter pattern matching              |
| 7        | `src/host-gateway/transport-session-manager.ts` | Session lifecycle                    |
| 8        | `src/adapters/http/routes.ts`                   | HTTP entry points                    |

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
