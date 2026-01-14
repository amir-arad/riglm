# Notes: Assumptions, Insights & Technical Debt

## Assumptions Made

### Product Assumptions

1. **Local-only deployment** - The server runs on the user's machine to enable:
   - Local MCP servers via stdio (spawning processes)
   - Access to local filesystem and environment
   - No network isolation that would break local MCPs

2. **Single-user model** - No authentication required for MVP
   - Multi-user/auth deferred to later phase
   - All sessions belong to the same user

3. **MCP as the protocol** - All extensions are MCP servers
   - Knowledge artifacts will be injected via MCP resources/tools (Phase 2)
   - No custom extension protocols

### Technical Assumptions

1. **Config format** - JSON5 for human readability
   - Supports comments and trailing commas
   - Single config file approach for simplicity

2. **Identifier constraints** - Server/endpoint names: `^[a-zA-Z_][a-zA-Z0-9_]*$`
   - No dashes allowed (would conflict with tool namespacing)
   - Tool names become `serverName-toolName`

3. **Transport detection** - URLs ending in `/sse` use SSE transport, others use HTTP
   - This is a convention, not enforced by MCP spec
   - Backward compatible with existing MCP servers

## Insights Discovered

### Architecture Insights

1. **Session isolation works well** - Each MCP client connection gets its own backend connections
   - No connection pooling = simpler cleanup
   - Trade-off: more connections per client

2. **Tool namespacing prevents collisions** - `serverName-toolName` pattern
   - Essential when aggregating multiple servers
   - Clients see unique tool names even if servers have same tools

3. **Filter hierarchy is flexible** - Server > Endpoint > Global
   - Server filters override for that server only
   - Endpoint filters apply at the gateway level
   - Global filters are fallback

### Code Quality Insights

1. **Service container pattern** - `makeServicesContainer` in `src/etc/service.ts`
   - Lazy initialization with automatic cleanup
   - AbortSignal propagation for graceful shutdown
   - Good pattern to follow for new services

2. **TypeScript strictness pays off** - Strict null checks catch many bugs
   - `satisfies never` pattern for exhaustive checks
   - Type inference reduces boilerplate

## Technical Debt

### High Priority

1. **Test suite broken** - Chai v5 ESM compatibility issue
   - Tests fail with: `Cannot require() ES Module chai.js`
   - Need to either downgrade chai or migrate to ESM imports
   - Workaround: Skip tests for now, fix before Phase 2

2. **No runtime config reload** - Config only loaded at startup
   - `ConfigManager.reload()` exists but not wired to signal
   - Need to implement for dynamic extension management

### Medium Priority

1. **No graceful degradation** - If one MCP server fails, entire session fails
   - Should continue with remaining servers
   - Log warning but don't block

2. **No connection health monitoring** - No heartbeat/ping for connections
   - Long-lived connections may silently die
   - Need reconnection logic

3. **Filter engine recreated per request** - `getFilterEngine()` caches but inefficiently
   - Should be cached at session level
   - Minor performance impact

### Low Priority

1. **Logging verbosity** - Debug logs are noisy
   - Should add log levels per component
   - Consider structured logging

2. **Error messages** - Some errors lack context
   - Should include server name, session ID
   - Better for debugging

## Removed Code (For Reference)

### Removed in Phase 1.1 (Config Consolidation)

- `src/config-manager.ts` (old) - Replaced by simplified version
- `src/etc/config-schema.ts` (old) - Had `contexts` layer
- `src/etc/config-migration.ts` - Migration from old to new format
- `src/simplified-config-manager.ts` - Renamed to `config-manager.ts`
- `src/etc/simplified-config-schema.ts` - Renamed to `config-schema.ts`

### Removed in Phase 1.2 (Dead Code)

- `connectServerImpl()` in `backend.service.ts` - Never called
- `sseServerActions()` in `backend.service.ts` - Only used by RPC endpoint
- `SseServerActions` type - No longer needed
- `/rpc` endpoint in `server.ts` - Unused RPC interface
- `typed-rpc/server` import - No longer needed

### Removed Directories (Workspace Cleanup)

- `FLUJO/` - Separate Next.js app (unrelated)
- `mcp-memory-zep/` - Standalone MCP server
- `cml/` - Parser library
- `pkg/` - WASM build output
- `cql/` - Specs for different project
- `knowledge/` - Unused reference files
- `local-env/` - Docker setup (local-only now)
- `reverse-http-transport/` - NAT traversal (deferred)
- `references/` - External references

## Questions to Resolve

1. **How to handle extension updates at runtime?**
   - Currently: Restart server to pick up config changes
   - Needed: Hot reload extensions without disconnecting clients

2. **How to persist session preferences?**
   - Per-session extension toggles should survive page refresh
   - Options: LocalStorage, server-side session store

3. **How to identify which tool is using the connection?**
   - MCP client sends name/version but not enough to distinguish
   - May need custom headers or endpoint paths per tool
