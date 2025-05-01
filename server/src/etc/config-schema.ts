export type Identifier = string; // Pattern: ^[a-zA-Z_][a-zA-Z0-9_]*$
export interface LocalServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
  description?: string;
}

export interface RemoteServer {
  url: string;
  headers?: Record<string, string>;
  description?: string;
}

export type Server = LocalServer | RemoteServer;

export interface Context {
  description?: string;
  guidelines?: string;
  servers: Identifier[];
}

export interface Endpoint {
  description?: string;
  contexts: Identifier[];
  apiKey?: string;
}

export interface Config {
  servers: Record<Identifier, Server>;
  contexts: Record<Identifier, Context>;
  endpoints: Record<Identifier, Endpoint>;
}

// Helper to determine if a server is local or remote
export function isLocalServer(server: Server): server is LocalServer {
  return "command" in server && "args" in server;
}

export function isRemoteServer(server: Server): server is RemoteServer {
  return "url" in server;
}

export function validateIdentifier(name: string): asserts name is Identifier {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid server name "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
}
