# Refactoring Plan: State Management and Cleanup

## Current Issues
1. Global state in configuration management
2. Stateful modules without proper lifecycle management
3. No clean way to tear down and recreate server instances
4. Potential state leakage between tests

## Objectives
1. Enable proper cleanup of server resources
2. Make testing more reliable
3. Allow server recreation with different configurations
4. Improve code maintainability

## Implementation Plan

### 1. Configuration Management
- Convert `config.ts` from global state to a class:
```typescript
export class ConfigManager {
  private currentConfig: Config | null = null;
  
  constructor(private configPath: string) {}
  
  load(): Config { /* ... */ }
  get(): Config { /* ... */ }
  reload(): boolean { /* ... */ }
}
```

### 2. Server Instance Management
- Create a main server class that encapsulates all components:
```typescript
export class McpProxyServer {
  private config: ConfigManager;
  private endpointServices: EndpointServiceManager;
  private httpServer: http.Server;
  
  constructor(configPath: string) {
    this.config = new ConfigManager(configPath);
  }
  
  async start(): Promise<void> { /* ... */ }
  async stop(): Promise<void> { /* ... */ }
}
```

### 3. Endpoint Service Management
- Convert `endpoint.service.ts` to a proper manager class:
```typescript
export class EndpointServiceManager {
  private services: Map<string, EndpointService>;
  
  constructor(private config: ConfigManager) {}
  
  initialize(): void { /* ... */ }
  cleanup(): Promise<void> { /* ... */ }
}
```

### 4. Session Management
- Enhance `TransportSessionManager` with better cleanup:
```typescript
export class TransportSessionManager {
  async cleanup(): Promise<void> {
    // Close all active sessions
    // Clean up resources
    // Reset state
  }
}
```

## Migration Steps

1. **Create New Classes**
   - Implement new class-based versions of each component
   - Add proper lifecycle methods (init, cleanup)
   - Keep existing code functional during migration

2. **Update Dependencies**
   - Modify dependency injection to use new classes
   - Update service creation/cleanup flows
   - Ensure proper resource management

3. **Update Main Application**
   - Create new application entry point using `McpProxyServer`
   - Implement graceful shutdown
   - Handle configuration reloading

4. **Update Tests**
   - Modify E2E tests to use new server class
   - Add cleanup calls in test teardown
   - Add tests for server lifecycle management

## Example Usage

```typescript
// Application
const server = new McpProxyServer("config.json");
await server.start();

// Handle shutdown
process.on("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});

// Testing
describe("E2E Tests", () => {
  let server: McpProxyServer;
  
  beforeEach(async () => {
    server = new McpProxyServer("test-config.json");
    await server.start();
  });
  
  afterEach(async () => {
    await server.stop();
  });
  
  it("should handle requests", async () => {
    // Test code here
  });
});
```

## Benefits

1. **Testing**
   - Clean state between tests
   - No resource leaks
   - More reliable test execution

2. **Development**
   - Better error handling
   - Clearer component lifecycles
   - Easier configuration management

3. **Production**
   - Proper cleanup on shutdown
   - Better resource management
   - More reliable configuration reloading

## Success Criteria

1. All tests pass consistently without cleanup warnings or timeouts
2. No resource leaks in long-running tests
3. Server can be started/stopped multiple times
4. Configuration can be reloaded without server restart
5. Clean shutdown in all scenarios (normal, error, signal)