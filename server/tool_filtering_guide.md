# Tool Filtering in Ghostweels

This guide explains how to use Ghostweels' tool filtering capabilities to control which tools are available across your servers.

## Ignore Filter

The filter system in Ghostweels allows you to completely remove tools from being available to your server. Use filtering when:

- You want to disable specific tools entirely
- You need to restrict access to certain tools for security or compliance reasons
- You want to simplify the tool selection for specific servers

**Example scenario**: You might want to filter out debugging tools in production environments to prevent accidental use.

```json
"filters": ["debug_*", "internal_*"]
```

## Hierarchical Filter Configuration

Ghostweels supports a hierarchical approach to filter configuration. You can define filters at two levels:

1. **Global level**: Applies to all servers by default
2. **Server-specific level**: Defined per server, overriding global filters completely

This hierarchical approach gives you flexibility in managing tool availability across your server fleet.

### Important Note

When a server defines its own filters, they **completely replace** the global filters for that server. This is not a merge operation - the server's filters fully override the global configuration.

### Example 1: Global Filters Only

In this example, we define filters only at the global level. All servers inherit these filters unless they define their own.

```json
{
  "filters": ["debug_*", "internal_*"],
  "servers": {
    "production_server": {
      "url": "https://production.example.com",
      "description": "Production server - inherits global filters"
      // No filters defined, so it inherits global filters
    },
    "development_server": {
      "command": "node",
      "args": ["server.js"],
      "description": "Local development server - inherits global filters"
      // No filters defined, so it inherits global filters
    }
  }
}
```

In this configuration, both `production_server` and `development_server` will inherit all global filters, filtering out tools matching any of the patterns defined in the global `filters` array.

### Example 2: Server-Specific Override

This example shows how a server can completely override global filters with its own configuration:

```json
{
  "filters": ["global_ignore_pattern"],
  "servers": {
    "production_server": {
      "url": "https://production.example.com",
      "description": "Production server with strict filtering",
      "filters": ["debug_*", "internal_*", "experimental_*"]
    },
    "development_server": {
      "command": "node",
      "args": ["server.js"],
      "description": "Development server - inherits global filters"
      // No filters defined, so it inherits global filters
    }
  }
}
```

In this configuration:
- `production_server` has its own set of filters that completely replace the global filters
- `development_server` inherits all global filters since it doesn't define its own

### Example 3: Server with No Filters (Inherits Global)

This example explicitly shows a server inheriting global filters:

```json
{
  "filters": ["another_global_pattern"],
  "servers": {
    "production_server": {
      "url": "https://production.example.com",
      "description": "Production server - explicitly inherits global filters",
      "filters": null  // Explicitly set to null (same as not defining filters)
    }
  }
}
```

In this configuration, `production_server` will inherit all global filters. Setting `filters` to `null` has the same effect as not defining it at all.

## Filter Pattern Syntax

Ghostweels uses a glob-style pattern matching for tool filters:

- `*` matches any sequence of characters
- `?` matches any single character

For example:
- `debug_*` matches any tool ID starting with "debug_"
- `*_internal` matches any tool ID ending with "_internal"
- `old_tool_v?` matches "old_tool_v1", "old_tool_v2", etc.

## Implementation Details

When you configure filters, Ghostweels:

1. Resolves the applicable filters for each server (server-specific or global)
2. Creates a `FilterEngine` instance for each unique filter configuration
3. Uses the filter engine to check if tools should be filtered based on their IDs
4. Filters out any tool that matches a pattern in the filters list

The filter resolution happens dynamically, so changes to your filter configuration are applied immediately upon reload.