/**
 * Transport Adapters - Factory and exports
 */

import {
  ClientTransportFactory,
  HttpServerTransportOptions,
  HttpServerTransportPort,
  HttpTransportConfig,
  ServerTransportFactory,
  SseTransportConfig,
  StdioTransportConfig,
  TransportPort
} from "../../../ports/transport.port";

import { HttpClientTransportAdapter } from "./http-client.adapter";
import { HttpServerTransportAdapter } from "./http-server.adapter";
import { SseClientTransportAdapter } from "./sse-client.adapter";
import { StdioClientTransportAdapter } from "./stdio-client.adapter";

/**
 * Factory implementation for creating client transports
 */
export class ClientTransportFactoryAdapter implements ClientTransportFactory {
  createStdioTransport(config: StdioTransportConfig): TransportPort {
    return new StdioClientTransportAdapter(config);
  }

  createSseTransport(config: SseTransportConfig): TransportPort {
    return new SseClientTransportAdapter(config);
  }

  createHttpTransport(config: HttpTransportConfig): TransportPort {
    return new HttpClientTransportAdapter(config);
  }
}

/**
 * Factory implementation for creating server transports
 */
export class ServerTransportFactoryAdapter implements ServerTransportFactory {
  createHttpServerTransport(options: HttpServerTransportOptions): HttpServerTransportPort {
    return new HttpServerTransportAdapter(options);
  }
}

// Export individual adapters for direct use
export { HttpClientTransportAdapter } from "./http-client.adapter";
export { HttpServerTransportAdapter } from "./http-server.adapter";
export { SseClientTransportAdapter } from "./sse-client.adapter";
export { SseServerTransportAdapter } from "./sse-server.adapter";
export { StdioClientTransportAdapter } from "./stdio-client.adapter";

