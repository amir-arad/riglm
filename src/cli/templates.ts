/**
 * Configuration Templates
 *
 * Template content for the `init` command.
 * @see docs/cli-design.md for specification
 */

// ============================================================================
// Minimal Template
// ============================================================================

export const MINIMAL_CONFIG = `{
  // Riglm Configuration
  // See: https://github.com/your-org/riglm

  // MCP servers to connect to
  "servers": {
    // Add your MCP servers here
    // "example": {
    //   "command": "npx",
    //   "args": ["-y", "@modelcontextprotocol/server-example"]
    // }
  },

  // Endpoints that aggregate servers
  "endpoints": {
    // Add your endpoints here
    // "main": {
    //   "servers": ["example"],
    //   "description": "Main endpoint"
    // }
  }
}
`;

export const MINIMAL_EXTENSIONS = `{
  "extensions": []
}
`;

// ============================================================================
// Standard Template
// ============================================================================

export const STANDARD_CONFIG = `{
  // Riglm Configuration
  // See: https://github.com/your-org/riglm

  // MCP servers to connect to
  "servers": {
    // Filesystem access (read/write files)
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "description": "Local filesystem access"
    },

    // HTTP fetch capabilities
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "description": "HTTP fetch capabilities"
    }
  },

  // Endpoints that aggregate servers
  "endpoints": {
    // Main endpoint with all servers
    "main": {
      "servers": ["filesystem", "fetch"],
      "description": "Main endpoint with filesystem and fetch"
    }
  }
}
`;

export const STANDARD_EXTENSIONS = `{
  "extensions": []
}
`;

// ============================================================================
// Full Template
// ============================================================================

export const FULL_CONFIG = `{
  // ==========================================================================
  // Riglm Configuration
  // ==========================================================================
  //
  // This is a JSON5 file - comments and trailing commas are allowed.
  // See: https://github.com/your-org/riglm
  //
  // Priority for settings: CLI flags > Environment variables > This file

  // ==========================================================================
  // Servers
  // ==========================================================================
  //
  // Define the MCP servers to connect to. Each server can be:
  // - Local (stdio): spawns a process with command/args
  // - Remote (SSE/HTTP): connects to a URL
  //
  // Server names must match: ^[a-zA-Z_][a-zA-Z0-9_]*$
  "servers": {

    // -------------------------------------------------------------------------
    // Example: Local stdio server (spawns a process)
    // -------------------------------------------------------------------------
    "filesystem": {
      // Command to execute
      "command": "npx",

      // Arguments to pass to the command
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],

      // Optional: Environment variables for the process
      "env": {
        // You can use environment variable interpolation:
        // "API_KEY": "\${MY_API_KEY}"
      },

      // Optional: Human-readable description
      "description": "Local filesystem access",

      // Optional: Tool filters for this server only
      // Patterns: "exact_name", "prefix_*", "*_suffix", "*_middle_*"
      "filters": [
        // "*_dangerous"  // Block tools ending with _dangerous
      ]
    },

    // -------------------------------------------------------------------------
    // Example: Remote SSE server (connects via HTTP)
    // -------------------------------------------------------------------------
    // "remote_service": {
    //   // SSE endpoint URL
    //   "url": "http://localhost:3001/sse",
    //
    //   // Optional: HTTP headers for authentication
    //   "headers": {
    //     "Authorization": "Bearer your-token-here"
    //   },
    //
    //   "description": "Remote MCP service"
    // }
  },

  // ==========================================================================
  // Endpoints
  // ==========================================================================
  //
  // Endpoints aggregate multiple servers into a single MCP endpoint.
  // MCP clients connect to: http://localhost:3000/:endpoint/sse
  //
  // Endpoint names must match: ^[a-zA-Z_][a-zA-Z0-9_]*$
  "endpoints": {

    // -------------------------------------------------------------------------
    // Main endpoint - aggregates selected servers
    // -------------------------------------------------------------------------
    "main": {
      // List of server names to include (required, at least one)
      "servers": ["filesystem"],

      // Optional: Human-readable description
      "description": "Main endpoint with filesystem access",

      // Optional: Tool filters for this endpoint
      // Applied to all servers in this endpoint unless server has own filters
      "filters": [
        // "*_internal"  // Block tools ending with _internal
      ],

      // Optional: API key for endpoint authentication (not yet implemented)
      // "apiKey": "your-endpoint-api-key"
    },

    // -------------------------------------------------------------------------
    // Example: Development endpoint with more tools
    // -------------------------------------------------------------------------
    // "dev": {
    //   "servers": ["filesystem", "remote_service"],
    //   "description": "Development endpoint with all tools"
    // }
  },

  // ==========================================================================
  // Global Filters (Optional)
  // ==========================================================================
  //
  // Filter patterns applied to ALL endpoints/servers as a fallback.
  // Priority: Server filters > Endpoint filters > Global filters
  //
  // Pattern syntax:
  // - "exact_name"     Match exactly
  // - "prefix_*"       Match starting with "prefix_"
  // - "*_suffix"       Match ending with "_suffix"
  // - "*_middle_*"     Match containing "_middle_"
  "filters": [
    // "*_debug",     // Block all debug tools
    // "*_internal"   // Block all internal tools
  ]
}
`;

export const FULL_EXTENSIONS = `{
  // ==========================================================================
  // Extension Registry
  // ==========================================================================
  //
  // Stores custom extensions that can be dynamically enabled/disabled.
  // This file is managed by Riglm - manual editing is possible
  // but changes will be overwritten when using the management API.

  "extensions": [
    // Example extension entry (managed by the system):
    // {
    //   "id": "unique-uuid-here",
    //   "name": "my-extension",
    //   "type": "local",
    //   "enabled": true,
    //   "config": {
    //     "command": "node",
    //     "args": ["./my-extension.js"]
    //   },
    //   "createdAt": "2024-01-01T00:00:00.000Z",
    //   "updatedAt": "2024-01-01T00:00:00.000Z"
    // }
  ]
}
`;
