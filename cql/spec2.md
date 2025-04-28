# ContextQL Specification v0.2

## 1. Overview

ContextQL is a command-and-query language designed to interact seamlessly with Model Context Protocol (MCP) environments. It utilizes a Unix-like, pipeline-oriented syntax for efficiently managing MCP contexts, servers, endpoints, and capabilities.

## 2. Language Fundamentals

### 2.1 Syntax Paradigm
- **Command-based**: Clear verb-noun command pairs.
- **Pipeline-oriented**: Unix-inspired chaining.
- **KDL-inspired**: Readable attribute syntax.
- **Type-safe**: Validated and typed operations.

### 2.2 Core Grammar
```ebnf
statement ::= command [ pipeline statement ]
command ::= verb [noun] [identifier] [attributes]
verb ::= "list" | "get" | "create" | "update" | "delete" | "call" | "map" | "unmap" | "connect" | "disconnect" | "deploy" | "undeploy" | "test" | "validate" | "apply" | "export" | "diff" | "filter" | "sort" | "limit" | "select" | "count" | "format" | "as"
noun ::= "context" | "contexts" | "server" | "servers" | "endpoint" | "endpoints" | "tool" | "tools" | "resource" | "resources" | "capability" | "capabilities" | "prompt" | "prompts" | "cml"
attributes ::= attribute { attribute }
attribute ::= attribute_name "=" attribute_value
attribute_value ::= string | number | boolean | null
boolean ::= "#true" | "#false"
null ::= "#null"
pipeline ::= "|"
```

### 2.3 Basic Command Structure
```
VERB [NOUN] [IDENTIFIER] [attributes...] | FILTER_COMMAND | TRANSFORM_COMMAND
```

## 3. Type System

### 3.1 Primitive Types
- `string`, `integer`, `float`, `boolean`, `datetime`, `null`

### 3.2 Complex Types
- `array`

### 3.3 Domain-Specific Objects
- `context`, `server`, `endpoint`, `tool`, `resource`, `capability`, `prompt`, `testResult`, `callResult`, `filterExpression`, `cmlDocument`

### 3.4 Identifier Types
- `contextId`, `serverId`, `endpointId`, `toolId`, `resourceId`

## 4. Command Reference

### 4.1 Context Commands
- `list contexts`
- `get context <contextId>`
- `create context <name>`
- `update context <contextId>`
- `delete context <contextId>`

### 4.2 Server Commands
- `list servers`
- `connect server <url>`
- `disconnect server <serverId>`
- `get server <serverId> status`

### 4.3 Capability Commands
- `list tools`
- `call tool <toolId>`
- `map tool <toolId> FROM server <serverId> TO context <contextId>`

### 4.4 Endpoint Commands
- `deploy endpoint <slug>`
- `test endpoint <slug>`

### 4.5 CML Integration Commands
- `validate cml`
- `apply cml`
- `export context <contextId> TO cml`

## 5. Filtering
- Structure: `filter <field> <operator> <value>`
- Operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `startswith`, `endswith`, `matches`, `in`, `isnull`
- Logical: `and`, `or`, `not`

## 6. Pipelines
Examples:
```
list tools | filter name contains "currency" | sort name | limit 5
get tool currency-converter | select name description inputSchema | format yaml
```

## 7. Variables and Environments
- Assignment: `list contexts | as $contexts`
- Usage: `deploy endpoint finance --context=$myContext`
- Operations: `$allContexts = $tradingContexts + $financeContexts`
- Environment Switching: `use production`

## 8. Error Handling
- Types: `SyntaxError`, `ValidationError`, `NotFoundError`, `AuthorizationError`, `ConnectionError`, `ExecutionError`
- Format: JSON structured error responses.

## 9. Integration with CML
- Reference: `get context @file.cml:trading-context`
- Generation: `export context trading-tools TO cml trading.cml`

## 10. Practical Examples
- Context Creation:
```
create context financial-tools description="Financial operations tools"
connect https://api.example.com/mcp/currency type="sse" | as $server
map tool currency-converter from=$server to=financial-tools
deploy finance context=financial-tools status="active"
```
- Tool Usage:
```
list tools | grep currency | select name description | format table
call currency-converter from=USD to=EUR amount=100
```

## 11. Shell Integration
- Interactive Shell: Command history, auto-completion, inline help.
- Scripting:
```bash
#!/usr/bin/env contextql
connect https://api.example.com/mcp --type=sse | as $server
list endpoints | filter status=active | xargs -I{} test endpoint {} --verbose
```

## 12. Implementation Considerations
- **Extensibility**: Plugins, custom formatters, adapters.
- **Security**: Authentication, authorization, logging.
- **Performance**: Lazy evaluation, streaming, optimization, parallel execution.

