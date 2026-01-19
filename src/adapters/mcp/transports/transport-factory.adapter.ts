import {
  ClientTransportFactory,
  HttpServerTransportOptions,
  HttpServerTransportPort,
  HttpTransportConfig,
  SseTransportConfig,
  StdioTransportConfig,
  TransportPort,
} from "../../../ports/transport.port";

import { HttpClientTransportAdapter } from "./http-client.adapter";
import { HttpServerTransportAdapter } from "./http-server.adapter";
import { SseClientTransportAdapter } from "./sse-client.adapter";
import { StdioClientTransportAdapter } from "./stdio-client.adapter";

export const clientTransportFactory: ClientTransportFactory = {
  createStdioTransport(config: StdioTransportConfig): TransportPort {
    return new StdioClientTransportAdapter(config);
  },

  createSseTransport(config: SseTransportConfig): TransportPort {
    return new SseClientTransportAdapter(config);
  },

  createHttpTransport(config: HttpTransportConfig): TransportPort {
    return new HttpClientTransportAdapter(config);
  },
};

export function createServerTransportAdapter(
  options: HttpServerTransportOptions,
): HttpServerTransportPort {
  return new HttpServerTransportAdapter(options);
}
