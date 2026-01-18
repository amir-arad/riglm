/**
 * Transport Port - Abstracts MCP transport layer
 * Covers SSE, Stdio, and HTTP transports for both client and server roles.
 */

/**
 * Core transport interface for MCP communication.
 * Wraps the underlying transport mechanism (SSE, stdio, HTTP).
 * Uses lowercase event handlers to match MCP SDK convention.
 */
export interface TransportPort {
  /**
   * Unique session identifier for this transport
   */
  readonly sessionId: string;

  /**
   * Start the transport connection
   */
  start(): Promise<void>;

  /**
   * Close the transport connection
   */
  close(): Promise<void>;

  /**
   * Error handler callback - called when transport encounters an error
   * Uses lowercase to match MCP SDK convention
   */
  onerror?: (error: Error) => void;

  /**
   * Close handler callback - called when transport closes
   * Uses lowercase to match MCP SDK convention
   */
  onclose?: () => void;
}

/**
 * Extended transport that exposes the underlying SDK transport.
 * Used internally by adapters that need to pass transport to SDK classes.
 */
export interface SdkTransportPort extends TransportPort {
  /**
   * Get the underlying SDK transport for direct SDK usage
   * This is an escape hatch for adapter implementations
   */
  getSdkTransport(): unknown;
}

// ============================================================================
// Transport Configuration Types
// ============================================================================

/**
 * Configuration for stdio transport (local MCP servers)
 */
export interface StdioTransportConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Configuration for SSE transport (remote MCP servers)
 */
export interface SseTransportConfig {
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Configuration for HTTP transport (remote MCP servers)
 */
export interface HttpTransportConfig {
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// ============================================================================
// Transport Factories
// ============================================================================

/**
 * Factory for creating client-side transports (connecting to MCP servers)
 */
export interface ClientTransportFactory {
  /**
   * Create a stdio transport for local MCP servers
   */
  createStdioTransport(config: StdioTransportConfig): TransportPort;

  /**
   * Create an SSE transport for remote MCP servers
   */
  createSseTransport(config: SseTransportConfig): TransportPort;

  /**
   * Create an HTTP transport for remote MCP servers
   */
  createHttpTransport(config: HttpTransportConfig): TransportPort;
}


