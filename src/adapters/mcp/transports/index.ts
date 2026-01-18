/**
 * Transport Adapters - Factory and exports
 */

import {
  ClientTransportFactory,
  HttpTransportConfig,
  SseTransportConfig,
  StdioTransportConfig,
  TransportPort
} from "../../../ports/transport.port";

import { HttpClientTransportAdapter } from "./http-client.adapter";
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

// Export individual adapters for direct use
export { HttpClientTransportAdapter } from "./http-client.adapter";
export { SseClientTransportAdapter } from "./sse-client.adapter";
export { SseServerTransportAdapter } from "./sse-server.adapter";
export { StdioClientTransportAdapter } from "./stdio-client.adapter";

