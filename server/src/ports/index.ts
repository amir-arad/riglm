/**
 * Port Interfaces - Abstractions for external dependencies
 * Application and domain layers depend on these interfaces,
 * while adapters provide concrete implementations.
 */

// Logger
export type { LoggerPort } from "./logger.port";

// Configuration
export type { ConfigStoragePort, ConfiguratorPort } from "./config-storage.port";

// Transport
export type {
  TransportPort,
  SdkTransportPort,
  StdioTransportConfig,
  SseTransportConfig,
  HttpTransportConfig,
  ClientTransportFactory,
  ServerTransportFactory,
  HttpResponsePort,
} from "./transport.port";

// MCP Client
export type {
  McpClientPort,
  McpClientFactory,
  ConnectOptions,
  RequestOptions,
  ListToolsResult,
  CallToolRequest,
} from "./mcp-client.port";

// MCP Server
export type {
  McpServerPort,
  McpServerFactory,
  McpServerConfig,
  RequestContext,
  ListToolsResponse,
  CallToolHandlerRequest,
} from "./mcp-server.port";
