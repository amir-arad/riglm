import { Closeable, PoolContext, closeAll } from "../etc/closeable";

import type { LoggerPort } from "../ports/logger.port";
import { TransportPort } from "../ports/transport.port";
import { setTimeout } from "timers/promises";

export type TransportSession = ReturnType<
  TransportSessionManager["createSession"]
>;

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
  private intervalId: NodeJS.Timeout | null = null;
  private isCleaningUp: boolean = false;

  constructor(private logger: LoggerPort) {
    this.intervalId = setInterval(() => {
      this.cleanupInactiveSessions().catch((err) => {
        this.logger.error("Error cleaning up inactive sessions:", err);
      });
    }, TRANSPORT_OPTIONS.cleanupInterval);

    this.logger.info(
      `SessionManager initialized with inactivity threshold of ${TRANSPORT_OPTIONS.inactivityThreshold / 1000 / 60
      } minutes`,
    );
  }

  createSession(transport: TransportPort, ctx?: PoolContext) {
    const { sessionId } = transport;
    if (!sessionId) {
      throw new Error("Transport session ID is required");
    }
    transport.onerror = (error) => {
      this.logger.error(`Error in session ${sessionId}:`, error);
      this.removeSession(sessionId).catch((err) => {
        this.logger.error(`Error removing session ${sessionId}:`, err);
      });
    };

    transport.onclose = () => {
      this.logger.info(`Transport for session ${sessionId} closed`);
      this.removeSession(sessionId).catch((err) => {
        this.logger.error(`Error removing session ${sessionId}:`, err);
      });
    };

    const services = new Map<string, Promise<Closeable>>([
      ["transport", Promise.resolve(transport)],
    ]);

    if (ctx?.signal) {
      ctx.signal.addEventListener(
        "abort",
        () => {
          this.logger.info(`Session ${sessionId} aborted by signal`);
          this.removeSession(sessionId).catch((error) => {
            this.logger.error(
              `Error removing aborted session ${sessionId}:`,
              error,
            );
          });
        },
        { once: true },
      );
    }

    const session = {
      sessionId,
      transport,
      createdAt: new Date(),
      lastActivity: new Date(),
      addService: (name: string, service: Promise<Closeable> | Closeable) => {
        if (services.has(name)) {
          this.logger.warn(`Service ${name} exists for session ${sessionId}`);
          return;
        }
        services.set(name, Promise.resolve(service));
      },
      close: async () => {
        this.logger.info(`Closing session ${sessionId}`);
        try {
          delete transport.onerror;
          delete transport.onclose;
          await closeAll(services.entries(), this.logger);
          this.sessions.delete(sessionId);
          this.logger.info(`Successfully closed session ${sessionId}`);
        } catch (error) {
          this.logger.error(`Error closing session ${sessionId}:`, error);
          throw error;
        }
      },
    };

    this.sessions.set(sessionId, session);
    this.logger.info(`New session created: ${sessionId}`);
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

    this.logger.info(`Removing session: ${sessionId}`);
    try {
      await session.close();
      this.logger.info(`Successfully removed session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to remove session ${sessionId}:`, error);
      throw error;
    }
  };

  getActiveSessions(): number {
    return this.sessions.size;
  }

  private async cleanupInactiveSessions(): Promise<CleanupStatus> {
    if (this.isCleaningUp) {
      this.logger.warn("Cleanup already in progress, skipping");
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
          this.logger.info(
            `Session ${sessionId} inactive for ${inactiveTime / 1000 / 60} minutes, removing`,
          );
          try {
            await this.removeSession(sessionId);
            status.sessionsRemoved++;
          } catch (error) {
            status.errors.push({ sessionId, error: error as Error });
            this.logger.error(
              `Error during cleanup of session ${sessionId}:`,
              error,
            );
          }
        }
      }

      status.remainingSessions = this.sessions.size;
      if (status.sessionsRemoved > 0) {
        this.logger.info(
          `Cleaned up ${status.sessionsRemoved} inactive sessions. Active sessions: ${status.remainingSessions}`,
        );
      }
    } finally {
      this.isCleaningUp = false;
    }

    return status;
  }

  async cleanup(): Promise<void> {
    this.logger.info(
      "Starting comprehensive cleanup of TransportSessionManager",
    );

    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.logger.info("Stopped cleanup interval");
      }
      if (this.isCleaningUp) {
        this.logger.warn("Cleanup in progress, waiting");
        while (this.isCleaningUp) {
          await setTimeout(10);
        }
      }
      this.isCleaningUp = true;
      const sessionCount = this.sessions.size;
      if (sessionCount > 0) {
        this.logger.info(`Closing ${sessionCount} active sessions`);
        await Promise.all(
          [...this.sessions.values()].map(async (session) => {
            try {
              await session.close();
            } catch (error) {
              this.logger.error(
                `Error closing session ${session.sessionId}:`,
                error,
              );
            }
          }),
        );
      }

      this.sessions.clear();
      this.logger.info(
        "TransportSessionManager cleanup completed successfully",
      );
    } catch (error) {
      this.logger.error("Error during TransportSessionManager cleanup:", error);
      throw error;
    } finally {
      this.isCleaningUp = false;
    }
  }

  async close(): Promise<void> {
    await this.cleanup();
  }
}
