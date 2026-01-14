# Refactoring Plan: State Management and Cleanup

> **Status: COMPLETED** - This plan was executed. See notes below for what was done.

## Original Objectives ✅

1. ✅ Enable proper cleanup of server resources
2. ✅ Make testing more reliable
3. ✅ Allow server recreation with different configurations
4. ✅ Improve code maintainability

## What Was Implemented

### 1. ConfigManager Class ✅

Created `src/config-manager.ts`:
```typescript
export class ConfigManager implements ServerConfigurator {
  private config: Config | null = null;

  constructor(private configPath: string) {}

  load(): Config { /* loads and validates JSON5 config */ }
  get(): Config { /* returns current config */ }
  getFilters(serverId?, endpointId?): Filters { /* filter resolution */ }
  reload(): boolean { /* hot reload support */ }
}
```

### 2. AbcServer Class ✅

Created `src/server.ts`:
```typescript
export class AbcServer {
  private httpServer: Server | null = null;
  private hostsServices: Services<HostsService> | null = null;

  constructor(private opts: ServerOptons) {}

  async start(): Promise<void> { /* starts Express server */ }
  async close(): Promise<void> { /* graceful shutdown */ }
}
```

### 3. Service Container Pattern ✅

Created `src/etc/service.ts`:
```typescript
export function makeServicesContainer<T>(
  factory: ServiceFactory<T>,
  name: string
): Services<T> {
  // Lazy initialization
  // Automatic cleanup
  // AbortSignal propagation
}
```

### 4. Session Management ✅

`TransportSessionManager` in `src/host-gateway/transport-session-manager.ts`:
- Per-session isolation
- Proper cleanup on disconnect
- AbortSignal integration

### 5. Graceful Shutdown ✅

In `src/index.ts`:
```typescript
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
```

## Remaining Items (Now in Phase 2+)

These items were identified but deferred to later phases:

1. **Configuration Hot Reload** - `reload()` exists but not wired to signal
   - Planned for Phase 2 (dynamic extension state)

2. **Test Reliability** - Tests have chai ESM issue
   - Need to fix before Phase 2

3. **Dynamic Tool Updates** - `listChanged` capability exists but not used
   - Planned for Phase 2 (extension toggle triggers notification)

## Current Architecture

```
index.ts
  └── AbcServer
        ├── ConfigManager (config loading)
        ├── makeSessionBackendFactory (MCP client connections)
        └── makeHostsServiceFactory (tool aggregation)
              └── HostsService (per endpoint)
                    ├── TransportSessionManager (client sessions)
                    └── hostSessions (per client connection)
                          └── Backend connections (per MCP server)
```

## Success Criteria Status

| Criteria | Status |
|----------|--------|
| Tests pass consistently | ⚠️ Chai ESM issue |
| No resource leaks | ✅ |
| Server start/stop multiple times | ✅ |
| Config reload without restart | ⚠️ Not wired |
| Clean shutdown | ✅ |

## Next Steps

See `docs/implementation-plan.md` for the continuation:
- Phase 1.4: Extension Registry
- Phase 2: Dynamic Extension State
- Phase 3: WebSocket Communication
- Phase 4: Client Redesign
