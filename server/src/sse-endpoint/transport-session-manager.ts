import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ServerResponse } from "http";
import { logger } from "../etc/logger";
import { closeServices, Service } from "../etc/service";
export interface TransportSession {
  sessionId: string;
  transport: SSEServerTransport;
  createdAt: Date;
  lastActivity: Date;
  addService: (name: string, service: Promise<Service>) => void;
  close(): Promise<void>;
}

export interface Options {
  inactivityThreshold?: number;
  cleanupInterval?: number;
}

export class TransportSessionManager {
  private sessions = new Map<string, TransportSession>();
  private server: Server;
  private inactivityThreshold: number;
  private cleanupInterval: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(server: Server, options?: Options) {
    this.server = server;
    this.inactivityThreshold = options?.inactivityThreshold || 30 * 60 * 1000;
    this.cleanupInterval = options?.cleanupInterval || 5 * 60 * 1000;

    this.intervalId = setInterval(() => {
      this.cleanupInactiveSessions().catch((err) => {
        logger.error("Error cleaning up inactive sessions:", err);
      });
    }, this.cleanupInterval);

    logger.info(
      `SessionManager initialized with inactivity threshold of ${this.inactivityThreshold / 1000 / 60} minutes`
    );
  }

  async createSession(endpoint: string, res: ServerResponse) {
    const transport = new SSEServerTransport(endpoint, res);
    const { sessionId } = transport;
    logger.info(`New session ${sessionId} for endpoint ${endpoint}`);
    transport.onerror = (error) => {
      logger.error(`Error in session ${sessionId}:`, error);
      this.removeSession(sessionId).catch((err) => {
        logger.error(`Error removing session ${sessionId}:`, err);
      });
    };
    transport.onclose = () => {
      logger.info(`Transport for session ${sessionId} closed`);
      this.removeSession(sessionId).catch((err) => {
        logger.error(`Error removing session ${sessionId}:`, err);
      });
    };
    await this.server.connect(transport);
    const services = new Map<string, Promise<Service>>([
      ["transport", Promise.resolve(transport)],
    ]);
    // const proxyConnections = sessionServerConnections(sessionId);
    const session = {
      sessionId,
      transport,
      createdAt: new Date(),
      lastActivity: new Date(),
      addService: (name: string, service: Promise<Service> | Service) => {
        if (services.has(name)) {
          logger.warn(`Service ${name} exists for session ${sessionId}`);
          return;
        }
        services.set(name, Promise.resolve(service));
      },
      close: async () => {
        logger.info(`Closing session ${sessionId}`);
        delete transport.onerror;
        delete transport.onclose;
        await closeServices(services.entries());
        this.sessions.delete(sessionId);
      },
    };
    this.sessions.set(sessionId, session);

    logger.info(`New session created: ${sessionId}`);
    return session;
  }

  getSession = (sessionId: string) => {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  };

  hasSession = (sessionId: string) => this.sessions.has(sessionId);

  removeSession = async (sessionId: string) => {
    await this.sessions.get(sessionId)?.close();
  };

  getActiveSessions() {
    return this.sessions.size;
  }

  private async cleanupInactiveSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > this.inactivityThreshold) {
        logger.info(
          `Session ${sessionId} inactive for ${inactiveTime / 1000 / 60} minutes, removing`
        );
        await this.removeSession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(
        `Cleaned up ${cleanedCount} inactive sessions. Active sessions: ${this.sessions.size}`
      );
    }
  }

  async close() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const sessionCount = this.sessions.size;
    await Promise.all(
      [...this.sessions.values()].map((session) => session.close())
    );
    logger.info(`Closed all ${sessionCount} sessions`);
  }
}
