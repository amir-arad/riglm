# Abort Signal Integration Guide for Node.js Services

## Overview

AbortSignal allows you to communicate cancellation across async operations. This guide shows how to integrate abort signals with your Express-based SSE server and service framework.

## AbortController Basics

```typescript
// Create an abort controller
const controller = new AbortController();
const signal = controller.signal;

// To abort the operation
controller.abort();
// Optional abort reason
controller.abort(new Error('Operation canceled by user'));
```

## Integration with Your Service Framework

```typescript
export type ServiceOptions = {
  signal?: AbortSignal;
};

export type Service = {
  close: (this: unknown) => Promise<unknown>;
};

// Enhanced service factory with abort signal support
export function makeServicesContainer<T extends Service>(
  factory: (id: string, options?: ServiceOptions) => Promise<T>,
  serviceName: string
) {
  const services = new Map<string, Promise<T>>();
  
  return {
    get: (id: string, options?: ServiceOptions) => {
      if (!services.has(id)) {
        const controller = new AbortController();
        const finalOptions = {
          ...options,
          signal: options?.signal 
            ? AbortSignal.any([options.signal, controller.signal])
            : controller.signal
        };
        
        const sp = factory(id, finalOptions).then((s) => {
          const orig_close = s.close;
          s.close = () => {
            if (services.get(id) === sp) {
              services.delete(id);
              controller.abort();
            }
            return orig_close();
          };
          return s;
        });
        
        services.set(id, sp);
        
        // Clean up on abort
        if (finalOptions.signal) {
          finalOptions.signal.addEventListener('abort', () => {
            if (services.get(id) === sp) {
              services.delete(id);
              sp.then(s => s.close()).catch(err => {
                logger.error(`Error closing aborted service: ${id}`, err);
              });
            }
          }, { once: true });
        }
        
        sp.catch((error) => {
          services.delete(id);
          controller.abort(error);
        });
      }
      return services.get(id)!;
    },
    close: () => closeServices(services.entries()),
  };
}
```

## Express SSE Implementation with Abort Signals

```typescript
import { Request, Response } from 'express';

function setupSSE(req: Request, res: Response) {
  // Get client abort signal or create one
  const clientSignal = req.get('x-abort-signal') 
    ? createAbortSignalFromHeader(req.get('x-abort-signal')!) 
    : new AbortController().signal;
    
  // Setup headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Handle client disconnect
  req.on('close', () => {
    if (!clientSignal.aborted) {
      // Use AbortController associated with the signal
      // @ts-ignore - accessing controller is not in the types but works
      clientSignal.controller?.abort(new Error('Client disconnected'));
    }
  });
  
  // Get the service with abort signal
  const servicePromise = services.get(req.params.id, { signal: clientSignal });
  
  // Listen for abort events
  clientSignal.addEventListener('abort', () => {
    res.end();
  });
  
  return { servicePromise, signal: clientSignal };
}
```

## Composing Multiple Abort Signals

```typescript
// Combine multiple abort signals (Node.js 17.3.0+)
const timeout = new AbortController();
setTimeout(() => timeout.abort(new Error('Timeout')), 30000);

const userAbort = new AbortController();
// User cancellation logic...

// Abort when any signal aborts
const combinedSignal = AbortSignal.any([
  req.signal,           // Request aborted
  timeout.signal,       // Timeout
  userAbort.signal      // User-initiated abort
]);

// Use the combined signal
const service = await services.get(id, { signal: combinedSignal });
```

## Handling Aborted Operations

```typescript
async function handleOperation(signal: AbortSignal) {
  // Check if already aborted
  if (signal.aborted) {
    throw new Error(`Operation aborted: ${signal.reason}`);
  }
  
  try {
    // Use with fetch or other APIs that accept signals
    const response = await fetch(url, { signal });
    
    // Custom abort handling for APIs without signal support
    return await new Promise((resolve, reject) => {
      const abortHandler = () => {
        cleanup();
        reject(signal.reason);
      };
      
      // Setup abort listener
      signal.addEventListener('abort', abortHandler, { once: true });
      
      function cleanup() {
        signal.removeEventListener('abort', abortHandler);
      }
      
      // Operation logic...
      // Call cleanup() and resolve() when done
    });
  } catch (err) {
    // AbortError is thrown when operation is aborted
    if (err.name === 'AbortError') {
      // Handle gracefully
      logger.info('Operation was aborted', err);
    }
    throw err;
  }
}
```

## Best Practices

1. **Propagate signals** down the call stack to all async operations
2. **Check signal.aborted** before expensive operations
3. **Handle AbortError** specifically in catch blocks
4. **Release resources** when aborted
5. **Use `AbortSignal.timeout()`** for automatic timeout aborts
6. **Test abort scenarios** thoroughly

## Additional Resources

- [Node.js AbortController Documentation](https://nodejs.org/api/globals.html#class-abortcontroller)
- [MDN AbortController Reference](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)