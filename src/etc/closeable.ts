import type { LoggerPort } from "../ports/logger.port";

export interface PoolContext {
  logger?: LoggerPort;

  signal?: AbortSignal;
}

export type Closeable = {
  close: (this: unknown) => Promise<unknown>;
};

export function closeAll(
  services: Iterable<[string, Promise<Closeable> | Closeable]>,
  logger?: LoggerPort,
) {
  return Promise.all(
    [...services].map(([name, serviceOrPromise]) =>
      Promise.resolve(serviceOrPromise).then((service) =>
        service.close().catch((error) => {
          logger?.error("Error closing service: " + name, error);
        }),
      ),
    ),
  );
}

export function createCloseablePool<T extends Closeable>(
  factory: (id: string, ctx?: PoolContext) => Promise<T>,
  serviceName: string,
  logger?: LoggerPort,
) {
  const services = new Map<string, Promise<T>>();
  return {
    get: (id: string, ctx?: PoolContext) => {
      if (!services.has(id)) {
        if (ctx?.signal?.aborted) {
          return Promise.reject(new Error("AbortSignal is already aborted"));
        }

        const servicePromise = factory(id, ctx).then((service) => {
          const originalClose = service.close;
          service.close = () => {
            if (services.get(id) === servicePromise) {
              services.delete(id);
            }
            return originalClose();
          };

          if (ctx?.signal) {
            ctx.signal.addEventListener(
              "abort",
              () => {
                logger?.info(`${serviceName} service aborted: ${id}`);
                service.close().catch((error) => {
                  logger?.error(
                    `Error closing aborted service ${serviceName}: ${id}`,
                    error,
                  );
                });
              },
              { once: true },
            );
          }

          logger?.info(`${serviceName} service created: ${id}`);
          return service;
        });

        services.set(id, servicePromise);
        servicePromise.catch((error) => {
          logger?.error(`Error creating ${serviceName} service: ${id}`, error);
          services.delete(id);
        });
      }
      return services.get(id)!;
    },
    close: () => closeAll(services.entries(), logger),
  };
}

export type CloseablePool<T extends Closeable> = ReturnType<
  typeof createCloseablePool<T>
>;
