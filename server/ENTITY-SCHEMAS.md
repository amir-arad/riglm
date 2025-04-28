# Entity Schemas

This document describes the schema of the main entities used in the system.

## Table of Contents

- [Entity Schemas](#entity-schemas)
  - [Table of Contents](#table-of-contents)
  - [Base Entity](#base-entity)
  - [Context Entity](#context-entity)
    - [Example](#example)
  - [Endpoint Entity](#endpoint-entity)
    - [Example](#example-1)
  - [Server Entity](#server-entity)
    - [Example](#example-2)

## Base Entity

All entities in the system inherit from the base `IEntity` interface, which provides common fields for all entity types.

```typescript
interface IEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}
```

| Field       | Type   | Description                                |
| ----------- | ------ | ------------------------------------------ |
| `id`        | string | Unique identifier for the entity           |
| `createdAt` | Date   | Timestamp when the entity was created      |
| `updatedAt` | Date   | Timestamp when the entity was last updated |

## Context Entity

A Context Entity represents an execution context that defines available tools and guidelines.

```typescript
type ContextEntity = IEntity & {
  name: string;
  description?: string;
  version?: string;
  status?: "active" | "draft" | "deprecated";
  guidelines?: string;
  tools?: Array<{
    serverId: string;
    originalName: string;
    exposedName?: string;
    description?: string;
    inputSchema?: Record<string, any>;
    configuration?: Record<string, any>;
  }>;
};
```

| Field                   | Type   | Description                                                                  |
| ----------------------- | ------ | ---------------------------------------------------------------------------- |
| `name`                  | string | Name of the context                                                          |
| `description`           | string | Description of the context's purpose and usage                               |
| `version`               | string | Version identifier for the context                                           |
| `status`                | enum   | Current status of the context: "active", "draft", "testing", or "deprecated" |
| `guidelines`            | string | Usage guidelines and instructions for the context                            |
| `tools`                 | array  | List of tools available in this context                                      |
| `tools[].serverId`      | string | ID of the server providing the tool                                          |
| `tools[].originalName`  | string | Original name of the tool on the server                                      |
| `tools[].exposedName`   | string | Name under which the tool is exposed in this context                         |
| `tools[].description`   | string | Description of the tool's functionality                                      |
| `tools[].inputSchema`   | object | Schema defining the expected input format for the tool                       |
| `tools[].configuration` | object | Configuration settings for the tool                                          |

### Example

```json
{
  "id": "context_1",
  "name": "Code Assistant",
  "description": "A context for code-related tasks",
  "version": "1.0.0",
  "status": "active",
  "guidelines": "Use this context for code generation, refactoring, and analysis tasks.",
  "tools": [
    {
      "serverId": "server_1",
      "originalName": "code_generator",
      "exposedName": "generateCode",
      "description": "Generates code based on a description",
      "inputSchema": {
        "language": "string",
        "description": "string"
      },
      "configuration": {
        "maxTokens": 1000
      }
    }
  ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

## Endpoint Entity

An Endpoint Entity represents an API endpoint that clients can connect to.

```typescript
type EndpointEntity = IEntity & {
  name: string;
  description?: string;
  contextIds: string[];
  status?: "active" | "draft" | "deprecated";
  url: string;
  apiKey?: string;
  usage?: { connections?: number; requests?: number };
};
```

| Field               | Type     | Description                                                                   |
| ------------------- | -------- | ----------------------------------------------------------------------------- |
| `name`              | string   | Name of the endpoint                                                          |
| `description`       | string   | Description of the endpoint's purpose and functionality                       |
| `contextIds`        | string[] | IDs of contexts available through this endpoint                               |
| `status`            | enum     | Current status of the endpoint: "active", "draft", "testing", or "deprecated" |
| `url`               | string   | URL where the endpoint is accessible                                          |
| `apiKey`            | string   | API key for authenticating requests to this endpoint                          |
| `usage`             | object   | Usage statistics for the endpoint                                             |
| `usage.connections` | number   | Number of active connections to the endpoint                                  |
| `usage.requests`    | number   | Total number of requests processed by the endpoint                            |

### Example

```json
{
  "id": "endpoint_1",
  "name": "Production API",
  "description": "Main production API endpoint",
  "contextIds": ["context_1", "context_2"],
  "status": "active",
  "url": "https://api.example.com/v1",
  "apiKey": "sk_prod_12345",
  "usage": {
    "connections": 42,
    "requests": 12345
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

## Server Entity

A Server Entity represents a tool server that provides functionality to contexts.

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

type ServerEntity = IEntity & {
  name: string;
  url: string;
  transportType: "sse" | "http";
  authType: string;
  apiKey: string;
  username: string;
  password: string;
  headers: Array<{
    name: string;
    value: string;
  }>;
  status: "active" | "draft" | "deprecated";
  error: string | null;
  lastConnected: string;
  tools: Array<ToolDefinition>;
};
```

| Field                            | Type           | Description                                                                 |
| -------------------------------- | -------------- | --------------------------------------------------------------------------- |
| `name`                           | string         | Name of the server                                                          |
| `url`                            | string         | URL where the server is accessible                                          |
| `transportType`                  | string         | Type of transport protocol used (e.g., "http", "websocket")                 |
| `authType`                       | string         | Authentication type (e.g., "apiKey", "basic")                               |
| `apiKey`                         | string         | API key for authentication (when authType is "apiKey")                      |
| `username`                       | string         | Username for authentication (when authType is "basic")                      |
| `password`                       | string         | Password for authentication (when authType is "basic")                      |
| `headers`                        | array          | Custom HTTP headers to include in requests                                  |
| `headers[].name`                 | string         | Name of the header                                                          |
| `headers[].value`                | string         | Value of the header                                                         |
| `status`                         | enum           | Current status of the server: "active", "draft", "testing", or "deprecated" |
| `error`                          | string \| null | Last error message, or null if no error                                     |
| `lastConnected`                  | string \| Date | Timestamp of the last successful connection                                 |
| `tools`                          | array          | List of tools provided by this server                                       |
| `tools[].name`                   | string         | Name of the tool                                                            |
| `tools[].description`            | string         | Description of the tool's functionality                                     |
| `tools[].inputSchema`            | object         | Schema defining the expected input format                                   |
| `tools[].inputSchema.type`       | string         | Type of the input (usually "object")                                        |
| `tools[].inputSchema.properties` | object         | Properties expected in the input                                            |
| `tools[].inputSchema.required`   | string[]       | List of required property names                                             |

### Example

```json
{
  "id": "server_1",
  "name": "Code Generation Server",
  "url": "https://code-gen.example.com/api",
  "transportType": "http",
  "authType": "apiKey",
  "apiKey": "sk_server_12345",
  "username": "",
  "password": "",
  "headers": [
    {
      "name": "Content-Type",
      "value": "application/json"
    }
  ],
  "status": "active",
  "error": null,
  "lastConnected": "2025-04-20T15:30:00.000Z",
  "tools": [
    {
      "name": "code_generator",
      "description": "Generates code based on a description",
      "inputSchema": {
        "type": "object",
        "properties": {
          "language": {
            "type": "string",
            "description": "Programming language to generate"
          },
          "description": {
            "type": "string",
            "description": "Description of the code to generate"
          }
        },
        "required": ["language", "description"]
      }
    }
  ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}