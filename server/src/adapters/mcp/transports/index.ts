/**
 * Transport Adapters - Factory and exports
 */

import {
  ClientTransportFactory,
  ServerTransportFactory,
  TransportPort,
  StdioTransportConfig,
  SseTransportConfig,
  HttpTransportConfig,
  HttpResponsePort,
} from "../../../ports/transport.port";
import { StdioClientTransportAdapter } from "./stdio-client.adapter";
import { SseClientTransportAdapter } from "./sse-client.adapter";
import { HttpClientTransportAdapter } from "./http-client.adapter";
import { SseServerTransportAdapter } from "./sse-server.adapter";

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
  createSseServerTransport(
    messagePath: string,
    response: HttpResponsePort
  ): TransportPort {
    return new SseServerTransportAdapter(messagePath, response);
  }
}

// Export individual adapters for direct use
export { StdioClientTransportAdapter } from "./stdio-client.adapter";
export { SseClientTransportAdapter } from "./sse-client.adapter";
export { HttpClientTransportAdapter } from "./http-client.adapter";
export { SseServerTransportAdapter } from "./sse-server.adapter";
