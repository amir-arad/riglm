# ContextQL Specification v0.2

## 1. Overview

ContextQL is a command and query language for interacting with Model Context Protocol (MCP) environments. It provides a Unix-like pipeline-oriented syntax for exploring, managing, and operating MCP contexts, servers, endpoints, and capabilities.

## 2. Language Fundamentals

### 2.1 Syntax Paradigm
- **Command-based**: Simple verb-noun commands that do one thing well
- **Pipeline-oriented**: Heavy emphasis on Unix-like command chaining
- **KDL-inspired**: Uses attribute syntax similar to KDL for readability
- **Type-safe**: All operations are typed with validation

### 2.2 Core Grammar
```ebnf
<statement> ::= <command> [<pipeline> <statement>]
<command> ::= <verb> [<noun>] [<identifier>] [<attributes>]
<verb> ::= "list" | "get" | "create" | "update" | "delete" | "call" | "map" | "unmap" | "connect" | "disconnect" | "deploy" | "undeploy" | "test" | "validate" | "apply" | "export" | "diff" | "filter" | "sort" | "limit" | "select" | "count" | "format" | "as"
<noun> ::= "context" | "contexts" | "server" | "servers" | "endpoint" | "endpoints" | "tool" | "tools" | "resource" | "resources" | "capability" | "capabilities" | "prompt" | "prompts" | "cml"
<attributes> ::= [<attribute> [<attributes>]]
<attribute> ::= <attribute_name>"="<attribute_value>
<attribute_value> ::= <string> | <number> | <boolean> | <null>
<boolean> ::= "#true" | "#false"
<null> ::= "#null"
<pipeline> ::= "|"
```

### 2.3 Basic Command Structure
```
VERB [NOUN] [IDENTIFIER] [attribute1=value1 attribute2=value2...] | FILTER_COMMAND | TRANSFORM_COMMAND
```

## 3. Type System

### 3.1 Primitive Types
- `string`: Text values (`"hello"`)
- `integer`: Whole numbers (`42`)
- `float`: Decimal numbers (`3.14`)
- `boolean`: True/false values (`#true`, `#false`)
- `datetime`: Date and time values (`2024-01-15T14:30:00Z`)
- `null`: Absence of value (`#null`)

### 3.2 Complex Types
- `array`: Ordered list of values

### 3.3 Domain-Specific Objects
- `context`: Context definition
- `server`: Server connection
- `endpoint`: Deployed endpoint
- `tool`: Tool definition
- `resource`: Resource definition
- `capability`: MCP capability
- `prompt`: Prompt template
- `testResult`: Result of testing operations
- `callResult`: Result of tool execution
- `filterExpression`: Query filter expression
- `cmlDocument`: Context Mapping Language document

### 3.4 Identifier Types
- `contextId`: String identifier for contexts
- `serverId`: String identifier for servers
- `endpointId`: String identifier for endpoints
- `toolId`: String identifier for tools
- `resourceId`: String identifier for resources

## 4. Command Reference

### 4.1 Context Commands

#### `list contexts`
Lists available contexts with optional filtering.
```
list contexts [WHERE filter] [WITH options]
```
- **Options**:
  - `limit`: Maximum number of results
  - `offset`: Starting point for pagination
  - `format`: Output format (json, table, yaml)
- **Returns**: Array of context objects

#### `get context`
Retrieves a specific context by ID.
```
get context <contextId> [WITH options]
```
- **Returns**: Context object

#### `create context`
Creates a new context.
```
create context <name> [WITH options]
```
- **Options**:
  - `description`: Text description
  - `servers`: Array of server references
  - `metadata`: Additional custom metadata
- **Returns**: Newly created context object

#### `update context`
Updates an existing context.
```
update context <contextId> WITH <options>
```
- **Returns**: Updated context object

#### `delete context`
Deletes a context.
```
delete context <contextId> [WITH options]
```
- **Options**:
  - `force`: Boolean to force deletion despite dependencies
- **Returns**: Deletion confirmation

### 4.2 Server Commands

#### `list servers`
Lists servers with optional filtering.
```
list servers [WHERE filter] [WITH options]
```
- **Returns**: Array of server objects

#### `connect server`
Establishes connection to an MCP server.
```
connect server <url> [WITH options]
```
- **Options**:
  - `transportType`: Transport protocol (sse, stdio)
  - `auth`: Authentication parameters
  - `timeout`: Connection timeout
- **Returns**: Connected server object

#### `disconnect server`
Disconnects from a server.
```
disconnect server <serverId>
```
- **Returns**: Disconnection confirmation

#### `get server status`
Retrieves server connection status.
```
get server <serverId> status
```
- **Returns**: Server status information

### 4.3 Capability Commands

#### `list tools`
Lists available tools with optional filtering.
```
list tools [WHERE filter] [WITH options]
```
- **Returns**: Array of tool objects

#### `call tool`
Executes a tool with parameters.
```
call tool <toolId> [FROM <source>] WITH <parameters>
```
- **Source**: Context or server ID
- **Parameters**: Tool-specific parameters
- **Returns**: Tool execution result

#### `map tool`
Maps a tool from a server to a context.
```
map tool <toolId> FROM server <serverId> TO context <contextId> [AS <alias>]
```
- **Returns**: Mapping confirmation

### 4.4 Endpoint Commands

#### `deploy endpoint`
Creates and activates an endpoint with a context.
```
deploy endpoint <slug> WITH context=<contextId> [WITH options]
```
- **Options**:
  - `description`: Text description
  - `status`: Initial status (active, inactive)
- **Returns**: Deployed endpoint object

#### `test endpoint`
Tests an endpoint's functionality.
```
test endpoint <slug> [tool <toolId>] [WITH parameters]
```
- **Returns**: Test result object

### 4.5 CML Integration Commands

#### `validate cml`
Validates CML syntax.
```
validate cml <content|file>
```
- **Returns**: Validation result

#### `apply cml`
Applies CML definitions.
```
apply cml <content|file> [WITH options]
```
- **Options**:
  - `dryRun`: Validate without applying
  - `force`: Override conflicts
- **Returns**: Application result

#### `export context`
Exports context to CML.
```
export context <contextId> TO cml [file <filename>]
```
- **Returns**: CML content

## 5. Filter Expressions

### 5.1 Structure for `filter` Command
```
filter <field> <operator> <value> [<logical> <expression>]
```

### 5.2 Structure for `grep` Command
Simple pattern matching:
```
grep <pattern>
```

Advanced pattern matching:
```
grep --field=name --pattern="currency"
```

### 5.3 Comparison Operators
- `=`, `==`, `eq`: Equality 
- `!=`, `neq`: Inequality
- `>`, `gt`: Greater than
- `>=`, `gte`: Greater than or equal
- `<`, `lt`: Less than
- `<=`, `lte`: Less than or equal
- `contains`: Substring presence
- `startswith`: String prefix
- `endswith`: String suffix
- `matches`: Regex matching
- `in`: Collection membership
- `isnull`: Null check

### 5.4 Logical Operators
- `and`: Logical conjunction
- `or`: Logical disjunction
- `not`: Logical negation

### 5.5 Examples
```
filter status = connected and lastConnected > 2024-01-01
filter name contains currency or description contains finance
grep currency                   # Simple pattern matching
grep --pattern="^currency-.*$"  # Regex pattern
```

## 6. Pipeline Patterns

### 6.1 Basic Filtering and Transformation
```
list tools | filter name contains "currency" | sort name | limit 5
```

### 6.2 Data Extraction and Formatting
```
get tool currency-converter | select name description inputSchema | format yaml
```

### 6.3 Multi-stage Processing
```
list contexts | filter tools.count > 5 | select name | sort --desc | format table
```

### 6.4 Variable Assignment
```
list tools | filter name contains currency | as $currencyTools
```

### 6.5 Command Composition
```
call $($currencyTools | select name | limit 1) --amount=100 --from=USD --to=EUR
```

## 7. Variables and Environments

### 7.1 Variable Assignment
Using `as` command in a pipeline:
```
list contexts | filter name contains trading | as $tradingContexts
get context trading-tools | as $myContext
```

Direct assignment:
```
$baseUrl = "https://api.example.com/mcp"
```

### 7.2 Variable Usage
```
deploy finance --context=$myContext
connect $baseUrl --type=sse
```

### 7.3 Variable Operations
```
# Combining variables
$allContexts = $tradingContexts + $financeContexts

# Accessing properties
$contextName = $myContext.name

# Using in subcommands
call $($tools | select name | limit 1) --amount=100
```

### 7.4 Environment Switching
```
use production
```

## 8. Error Handling

### 8.1 Error Types
- `SyntaxError`: Invalid command syntax
- `ValidationError`: Invalid parameters
- `NotFoundError`: Resource not found
- `AuthorizationError`: Permission denied
- `ConnectionError`: Server connection issues
- `ExecutionError`: Command execution failure

### 8.2 Error Response Format
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Required parameter 'amount' is missing",
    "code": "PARAM_REQUIRED",
    "details": {
      "parameter": "amount",
      "location": "WITH clause"
    }
  }
}
```

## 9. Integration with CML

### 9.1 CML References
ContextQL can directly reference CML elements:
```
apply cml file.cml
get context @file.cml:trading-context
```

### 9.2 CML Generation
```
export context trading-tools TO cml trading.cml WITH pretty=true
```

## 10. Examples

### 10.1 Basic Context Creation
```
# Create a new context for financial tools
create context financial-tools description="Tools for financial operations"

# Connect to a currency server
connect https://api.example.com/mcp/currency type="sse" | as $server

# Map tools from the server to the context
map tool currency-converter from=$server to=financial-tools
map tool exchange-rates from=$server to=financial-tools

# Deploy an endpoint with the context
deploy finance context=financial-tools status="active"
```

### 10.2 Tool Discovery and Usage
```
# Find all currency-related tools
list tools | filter name contains "currency" or description contains "currency"

# Get only names and descriptions
list tools | grep currency | select name description | format table

# Call a specific tool
call currency-converter from=USD to=EUR amount=100
```

### 10.3 Context Management and Analysis
```
# Export context to CML
export context financial-tools | format cml > financial.cml

# Update with changes from file
diff context financial-tools financial.cml | apply

# Analyze contexts
list contexts | select name tool_count | sort tool_count desc=#true | limit 5

# Find contexts with specific tools
list contexts | filter tools contains "currency-converter" | format table
```

### 10.4 Advanced Pipelines
```
# Find and test all conversion tools
list tools | 
  filter name contains "convert" | 
  select name | 
  format lines | 
  xargs -I{} call {} amount=100 from=USD to=EUR

# Create a report of server tools
list servers | 
  as $servers |
  foreach $servers as $server { 
    echo "# Tools in $server.name" 
    list tools | filter server=$server.id | select name description | format markdown
  } | 
  format document | 
  save server-tools-report.md
```

## 11. Shell Integration

### 11.1 Interactive Mode
ContextQL provides an interactive shell with:
- Command history
- Auto-completion for commands, parameters, and resource names
- Inline help and documentation
- Color-coded output

### 11.2 Script Mode
ContextQL can be used in scripts:
```bash
#!/usr/bin/env contextql

# Connect to server
connect https://api.example.com/mcp --type=sse | as $server

# Process all endpoints
list endpoints | 
  filter status = active | 
  format lines | 
  xargs -I{} test endpoint {} --verbose
```

### 11.3 System Integration
- Redirect output to files: `list tools | format json > tools.json`
- Include external files: `source ./variables.cql`
- Execute shell commands: `!ls -la`
- Use environment variables: `$SERVER_URL = $env.MCP_SERVER_URL`

## 12. Implementation Considerations

### 12.1 Extensibility
ContextQL should support:
- Plugin architecture for custom commands
- Extensible output formatters
- Custom transport adapters
- User-defined functions and transforms

### 12.2 Security
Implementation should enforce:
- Strong authentication
- Authorization and access control
- Audit logging
- Secure credential handling

### 12.3 Performance
For pipeline efficiency:
- Lazy evaluation of pipeline stages
- Streaming-based processing
- Query optimization
- Parallelization of independent operations