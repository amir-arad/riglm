

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


export class ServerTransportFactoryAdapter implements ServerTransportFactory {
  createHttpServerTransport(options: HttpServerTransportOptions): HttpServerTransportPort {
    return new HttpServerTransportAdapter(options);
  }
}
