# MVP Configuration Migration Plan

## Overview

The MVP will move from a database-driven dynamic configuration to a simple file-based configuration system. Configuration changes will be made by editing the JSON file directly and reloading the application (or sending a reload signal).

## Major Simplifications

* Remove the web UI client (configuration changes made via file edits only)
* Remove the entire `entities/` directory and SQLite database (no dynamic entity management needed)
* Remove REST API endpoints for entity management

## Required Changes

### 1. Configuration Loading

```typescript
// Add to etc/env.ts
export const env = {
  // ... existing env vars ...
  mvpConfigPath: process.env.MVP_CONFIG_PATH || 
    path.join(process.cwd(), "config.json"),
};

// New module: src/config.ts
import { readFileSync } from 'fs';
import { env } from './etc/env';
import { logger } from './etc/logger';

let currentConfig: Config | null = null;

export function loadConfig(): Config {
  try {
    const configData = readFileSync(env.mvpConfigPath, 'utf8');
    const config = JSON.parse(configData);
    // TODO: Add schema validation
    currentConfig = config;
    return config;
  } catch (error) {
    logger.error('Failed to load configuration:', error);
    throw error;
  }
}

export function getCurrentConfig(): Config {
  if (!currentConfig) {
    throw new Error('Configuration not loaded');
  }
  return currentConfig;
}
```

### 2. Server Connection Management (`sse-server/server.service.ts`)

```typescript
// Replace database-driven server loading with config-based approach
const makeServerConnection = (sessionId: string) => async (serverName: string) => {
  const config = getCurrentConfig();
  const serverConfig = config.servers[serverName];
  if (!serverConfig) {
    throw new Error(`Server "${serverName}" not found in configuration`);
  }

  if ('command' in serverConfig) {
    // Handle local server
    const transport = await startLocalServer(serverConfig);
    // ... connect using transport
  } else {
    // Handle remote server
    const transport = createTransport({
      transportType: "sse",
      url: serverConfig.url,
      headers: serverConfig.headers || {},
    });
    // ... connect using transport
  }
  // ... rest of connection logic
};
```

### 3. Endpoint Service Management (`sse-endpoint/endpoint.service.ts`)

```typescript
async function makeEndpointService(name: string) {
  const config = getCurrentConfig();
  const endpoint = config.endpoints[name];
  if (!endpoint) {
    throw new Error(`Endpoint "${name}" not found in configuration`);
  }

  // Set up MCP server
  const mcpServer = new Server(
    {
      name,
      description: endpoint.description || `Endpoint ${name}`,
      version: "1.0.0",
    },
    { capabilities: { tools: { listChanged: true } } }
  );

  // Load contexts
  const contexts = endpoint.contexts.map(contextName => {
    const context = config.contexts[contextName];
    if (!context) {
      throw new Error(`Context "${contextName}" not found`);
    }
    return context;
  });

  // Set up connections to required servers
  const serverNames = new Set(contexts.flatMap(context => context.servers));
  // ... rest of service setup
}
```

### 4. Configuration Reloading

```typescript
// Add to src/index.ts
import { loadConfig } from './config';

// Initial load
loadConfig();

// Add reload handler
process.on('SIGHUP', () => {
  logger.info('Received SIGHUP, reloading configuration...');
  try {
    loadConfig();
    // Notify any active sessions if needed
    logger.info('Configuration reloaded successfully');
  } catch (error) {
    logger.error('Failed to reload configuration:', error);
  }
});
```

## Files to Remove

* `server/src/entities/` (entire directory)
* Any client-side configuration management code
* Database initialization and management code
* Entity-related REST API routes and controllers

## Migration Steps

1. Create the new configuration module (`src/config.ts`)
2. Modify `etc/env.ts` to add configuration file path
3. Update `sse-server/server.service.ts` to use file-based configuration
4. Update `sse-endpoint/endpoint.service.ts` to use file-based configuration
5. Add configuration reload handling
6. Remove unnecessary code (entities, database, REST API)
7. Update startup sequence to load configuration
8. Add validation against the MVP schema

## Error Handling

* Fail fast on startup if configuration file is missing or invalid
* Log detailed validation errors to help users fix configuration issues
* Maintain existing error handling for runtime issues (connection failures, etc.)
* On reload failures, keep using existing configuration