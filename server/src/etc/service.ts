import { logger } from "./logger";

/**
 * Options for service creation and management
 */
export interface ServiceOptions {
  /**
   * Optional AbortSignal for controlling service lifecycle
   */
  signal?: AbortSignal;
}

/**
 * A generic service interface
 */
export type Service = {
  /**
   * A method to close the service
   * @param this should never be used, the function MUST be pre-bound to the service
   * @returns A promise that resolves when the service is closed
   */
  close: (this: unknown) => Promise<unknown>;
};

export function closeServices(
  services: Iterable<[string, Promise<Service> | Service]>
) {
  return Promise.all(
    [...services].map(([name, ep]) =>
      Promise.resolve(ep).then((e) =>
        e.close().catch((error) => {
          logger.error("Error closing service: " + name, error);
        })
      )
    )
  );
}

export function makeServicesContainer<T extends Service>(
  factory: (id: string, options?: ServiceOptions) => Promise<T>,
  serviceName: string
) {
  const services = new Map<string, Promise<T>>();
  return {
    get: (id: string, options?: ServiceOptions) => {
      if (!services.has(id)) {
        // Check if signal is already aborted
        if (options?.signal?.aborted) {
          return Promise.reject(new Error("AbortSignal is already aborted"));
        }

        const sp = factory(id, options).then((s) => {
          const orig_close = s.close;
          s.close = () => {
            if (services.get(id) === sp) {
              services.delete(id);
            }
            return orig_close();
          };

          // Handle abort signal
          if (options?.signal) {
            options.signal.addEventListener(
              "abort",
              () => {
                logger.info(`${serviceName} service aborted: ${id}`);
                s.close().catch((error) => {
                  logger.error(
                    `Error closing aborted service ${serviceName}: ${id}`,
                    error
                  );
                });
              },
              { once: true }
            );
          }

          logger.info(`${serviceName} service created: ${id}`);
          return s;
        });

        services.set(id, sp);
        sp.catch((error) => {
          logger.error(`Error creating ${serviceName} service: ${id}`, error);
          services.delete(id);
        });
      }
      return services.get(id)!;
    },
    close: () => closeServices(services.entries()),
  };
}

/**
 * A container for creating, retreiving and closing services of type `T`.
 *
 * @template T - The type of the service.
 **/
export type Services<T extends Service> = ReturnType<
  typeof makeServicesContainer<T>
>;
