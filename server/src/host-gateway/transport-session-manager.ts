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
  addService: (name: string, service: Promise<Service> | Service) => void;
  close(): Promise<void>;
}
export interface CleanupStatus {
  sessionsRemoved: number;
  remainingSessions: number;
  errors: Array<{ sessionId: string; error: Error }>;
}
const TRANSPORT_OPTIONS = {
  inactivityThreshold: 30 * 60 * 1000,
  cleanupInterval: 5 * 60 * 1000,
};
export class TransportSessionManager {
  private sessions = new Map<string, TransportSession>();
  private server: Server;
  private intervalId: NodeJS.Timeout | null = null;
  private isCleaningUp: boolean = false;

  constructor(server: Server) {
    this.server = server;

    this.intervalId = setInterval(() => {
      this.cleanupInactiveSessions().catch((err) => {
        logger.error("Error cleaning up inactive sessions:", err);
      });
    }, TRANSPORT_OPTIONS.cleanupInterval);

    logger.info(
      `SessionManager initialized with inactivity threshold of ${
        TRANSPORT_OPTIONS.inactivityThreshold / 1000 / 60
      } minutes`
    );
  }

  async createSession(
    endpoint: string,
    res: ServerResponse
  ): Promise<TransportSession> {
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
        try {
          delete transport.onerror;
          delete transport.onclose;
          await closeServices(services.entries());
          this.sessions.delete(sessionId);
          logger.info(`Successfully closed session ${sessionId}`);
        } catch (error) {
          logger.error(`Error closing session ${sessionId}:`, error);
          throw error;
        }
      },
    };

    this.sessions.set(sessionId, session);
    logger.info(`New session created: ${sessionId}`);
    return session;
  }

  getSession = (sessionId: string): TransportSession | undefined => {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  };

  hasSession = (sessionId: string): boolean => this.sessions.has(sessionId);

  removeSession = async (sessionId: string): Promise<void> => {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    logger.info(`Removing session: ${sessionId}`);
    try {
      await session.close();
      logger.info(`Successfully removed session: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to remove session ${sessionId}:`, error);
      throw error;
    }
  };

  getActiveSessions(): number {
    return this.sessions.size;
  }

  private async cleanupInactiveSessions(): Promise<CleanupStatus> {
    if (this.isCleaningUp) {
      logger.warn("Cleanup already in progress, skipping");
      return {
        sessionsRemoved: 0,
        remainingSessions: this.sessions.size,
        errors: [],
      };
    }

    this.isCleaningUp = true;
    const now = new Date();
    const status: CleanupStatus = {
      sessionsRemoved: 0,
      remainingSessions: 0,
      errors: [],
    };

    try {
      for (const [sessionId, session] of this.sessions.entries()) {
        const inactiveTime = now.getTime() - session.lastActivity.getTime();
        if (inactiveTime > TRANSPORT_OPTIONS.inactivityThreshold) {
          logger.info(
            `Session ${sessionId} inactive for ${inactiveTime / 1000 / 60} minutes, removing`
          );
          try {
            await this.removeSession(sessionId);
            status.sessionsRemoved++;
          } catch (error) {
            status.errors.push({ sessionId, error: error as Error });
            logger.error(
              `Error during cleanup of session ${sessionId}:`,
              error
            );
          }
        }
      }

      status.remainingSessions = this.sessions.size;
      if (status.sessionsRemoved > 0) {
        logger.info(
          `Cleaned up ${status.sessionsRemoved} inactive sessions. Active sessions: ${status.remainingSessions}`
        );
      }
    } finally {
      this.isCleaningUp = false;
    }

    return status;
  }

  async cleanup(): Promise<void> {
    logger.info("Starting comprehensive cleanup of TransportSessionManager");

    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        logger.info("Stopped cleanup interval");
      }
      if (this.isCleaningUp) {
        logger.warn("Cleanup in progress, waiting");
        while (this.isCleaningUp) {
          await setTimeout.__promisify__(10);
        }
      }
      this.isCleaningUp = true;
      const sessionCount = this.sessions.size;
      if (sessionCount > 0) {
        logger.info(`Closing ${sessionCount} active sessions`);
        await Promise.all(
          [...this.sessions.values()].map(async (session) => {
            try {
              await session.close();
            } catch (error) {
              logger.error(
                `Error closing session ${session.sessionId}:`,
                error
              );
            }
          })
        );
      }

      this.sessions.clear();
      logger.info("TransportSessionManager cleanup completed successfully");
    } catch (error) {
      logger.error("Error during TransportSessionManager cleanup:", error);
      throw error;
    }
  }

  /**
   * Closes the session manager and all active sessions
   */
  async close(): Promise<void> {
    await this.cleanup();
  }
}
