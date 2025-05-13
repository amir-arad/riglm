# Node.js AbortSignal API Reference

## Overview

`AbortSignal` is an interface that represents a signal object that allows you to communicate with a DOM request and abort it if required via an `AbortController` object.

## Class: AbortSignal

An interface for abortion signals.

```typescript
interface AbortSignal extends EventTarget {
  readonly aborted: boolean;
  readonly reason: any;
  throwIfAborted(): void;
  onabort: ((this: AbortSignal, ev: Event) => any) | null;
}
```

## Static Methods

### AbortSignal.abort([reason])

Creates an `AbortSignal` object that is already set as aborted.

```typescript
static abort(reason?: any): AbortSignal
```

- **Parameters:**
  - `reason` (optional): The abort reason, retrievable from the `reason` property.
- **Returns:** An AbortSignal that is already aborted.
- **Example:**
  ```typescript
  const alreadyAbortedSignal = AbortSignal.abort();
  console.log(alreadyAbortedSignal.aborted); // true
  
  // With reason
  const abortedWithReason = AbortSignal.abort(new Error('Operation not needed'));
  console.log(abortedWithReason.reason.message); // 'Operation not needed'
  ```

### AbortSignal.timeout(milliseconds)

Returns an AbortSignal that will automatically abort after the specified timeout.

```typescript
static timeout(milliseconds: number): AbortSignal
```

- **Parameters:**
  - `milliseconds`: The time in milliseconds to wait before automatically aborting.
- **Returns:** An AbortSignal that will automatically abort after the specified timeout.
- **Example:**
  ```typescript
  const timeoutSignal = AbortSignal.timeout(5000); // Aborts after 5 seconds
  
  try {
    const response = await fetch(url, { signal: timeoutSignal });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Request timed out after 5 seconds');
    }
  }
  ```

### AbortSignal.any(signals)

Returns an AbortSignal that will abort if any of the provided signals abort.

```typescript
static any(signals: Iterable<AbortSignal>): AbortSignal
```

- **Parameters:**
  - `signals`: An iterable of AbortSignal objects.
- **Returns:** A new AbortSignal that is aborted when any of the input signals is aborted.
- **Example:**
  ```typescript
  const controller1 = new AbortController();
  const controller2 = new AbortController();
  
  const combinedSignal = AbortSignal.any([
    controller1.signal,
    controller2.signal,
    AbortSignal.timeout(10000)
  ]);
  
  // This fetch will abort if controller1 aborts, controller2 aborts, or 10 seconds pass
  fetch(url, { signal: combinedSignal });
  ```

## Instance Properties

### signal.aborted

A Boolean that indicates whether the request(s) the signal is communicating with is/are aborted (`true`) or not (`false`).

```typescript
readonly aborted: boolean
```

- **Type:** `boolean`
- **Read only:** Yes
- **Example:**
  ```typescript
  const controller = new AbortController();
  const signal = controller.signal;
  
  console.log(signal.aborted); // false
  
  controller.abort();
  console.log(signal.aborted); // true
  ```

### signal.reason

The abort reason passed to the `AbortController.abort()` method.

```typescript
readonly reason: any
```

- **Type:** `any`
- **Read only:** Yes
- **Default:** `undefined` if not aborted, otherwise the provided reason or a DOMException with the name "AbortError"
- **Example:**
  ```typescript
  const controller = new AbortController();
  const signal = controller.signal;
  
  controller.abort(new Error('Operation canceled by user'));
  console.log(signal.reason.message); // 'Operation canceled by user'
  ```

## Instance Methods

### signal.throwIfAborted()

Throws the AbortSignal's reason if the AbortSignal has been aborted, otherwise does nothing.

```typescript
throwIfAborted(): void
```

- **Returns:** `void`
- **Throws:** The AbortSignal's `reason` if the signal has been aborted.
- **Example:**
  ```typescript
  const controller = new AbortController();
  const signal = controller.signal;
  
  // This will not throw
  signal.throwIfAborted();
  
  controller.abort(new Error('Aborted operation'));
  
  try {
    // This will throw the Error('Aborted operation')
    signal.throwIfAborted();
  } catch (err) {
    console.error(err.message); // 'Aborted operation'
  }
  ```

## Event Handling

### Event: 'abort'

The `abort` event is fired when the abort operation is invoked on the associated `AbortController`.

```typescript
signal.addEventListener('abort', () => {
  // Cleanup logic
});
```

### signal.onabort

An event handler for the `abort` event.

```typescript
signal.onabort = (event) => {
  // Handle abort event
};
```

- **Type:** `((this: AbortSignal, ev: Event) => any) | null`
- **Example:**
  ```typescript
  const controller = new AbortController();
  const signal = controller.signal;
  
  signal.onabort = () => {
    console.log('Aborted!');
    console.log('Reason:', signal.reason);
  };
  
  controller.abort('Operation canceled');
  // Output:
  // Aborted!
  // Reason: Operation canceled
  ```

## Usage with Node.js APIs

### HTTP Requests (fetch)

```typescript
const controller = new AbortController();
const signal = controller.signal;

setTimeout(() => controller.abort(), 5000); // Abort after 5 seconds

try {
  const response = await fetch('https://example.com', { signal });
  const data = await response.json();
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Fetch aborted');
  } else {
    console.error('Error:', err);
  }
}
```

### File System Operations

```typescript
import { readFile } from 'fs/promises';

const controller = new AbortController();
const signal = controller.signal;

// Abort after 1 second
setTimeout(() => controller.abort(), 1000);

try {
  const content = await readFile('large-file.txt', { signal });
  console.log(content);
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('File reading was aborted');
  } else {
    console.error('Error reading file:', err);
  }
}
```

### Event Emitters

```typescript
import { on, EventEmitter } from 'events';

const emitter = new EventEmitter();
const controller = new AbortController();
const signal = controller.signal;

// Abort after 10 seconds
setTimeout(() => controller.abort(), 10000);

(async () => {
  try {
    for await (const [value] of on(emitter, 'data', { signal })) {
      console.log('Received:', value);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Event listening was aborted');
    } else {
      console.error('Error:', err);
    }
  }
})();

// Emit some data
setInterval(() => emitter.emit('data', 'hello'), 1000);
```

### Timers

```typescript
// Timeout with abort signal
const controller = new AbortController();
const signal = controller.signal;

const timeoutPromise = new Promise((resolve, reject) => {
  const id = setTimeout(() => resolve('Timeout completed'), 5000);
  
  signal.addEventListener('abort', () => {
    clearTimeout(id);
    reject(new Error('Timeout aborted'));
  }, { once: true });
});

// Abort the timeout after 2 seconds
setTimeout(() => controller.abort(), 2000);

try {
  const result = await timeoutPromise;
  console.log(result);
} catch (err) {
  console.log(err.message); // 'Timeout aborted'
}
```

## Custom Async Function with AbortSignal

```typescript
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  
  // Combine the passed signal (if any) with our timeout signal
  const signal = options.signal 
    ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  
  return fetch(url, {
    ...options,
    signal
  });
}

// Usage
try {
  const response = await fetchWithTimeout('https://example.com', {}, 3000);
  console.log(await response.text());
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Request timed out or was aborted');
  }
}
```

## Creating Cancellable Async Operations

```typescript
async function cancellableOperation(signal) {
  // Check if already aborted
  if (signal?.aborted) {
    throw new Error(`Operation aborted: ${signal.reason}`);
  }
  
  return new Promise((resolve, reject) => {
    let cleanup = () => {};
    
    // Set up abort handling
    if (signal) {
      const abortHandler = () => {
        cleanup();
        reject(signal.reason || new Error('Operation aborted'));
      };
      
      if (signal.aborted) {
        abortHandler();
        return;
      }
      
      signal.addEventListener('abort', abortHandler, { once: true });
      cleanup = () => signal.removeEventListener('abort', abortHandler);
    }
    
    // The actual async operation
    const timeout = setTimeout(() => {
      cleanup();
      resolve('Operation completed');
    }, 5000);
    
    // Extend cleanup to clear the timeout
    const originalCleanup = cleanup;
    cleanup = () => {
      clearTimeout(timeout);
      originalCleanup();
    };
  });
}

// Usage
const controller = new AbortController();
setTimeout(() => controller.abort('User canceled'), 2000);

try {
  const result = await cancellableOperation(controller.signal);
  console.log(result);
} catch (err) {
  console.log(err.message); // 'User canceled'
}
```

## Node.js Version Compatibility

- **AbortController/AbortSignal**: Available since Node.js 15.0.0
- **AbortSignal.abort()**: Available since Node.js 15.12.0
- **AbortSignal.timeout()**: Available since Node.js 17.3.0
- **AbortSignal.any()**: Available since Node.js 17.3.0

## Error Handling Best Practices

1. Always check for the `AbortError` name in catch blocks
2. Provide meaningful messages when aborting operations
3. Clean up resources when operations are aborted
4. Check if the signal is already aborted before starting expensive operations

```typescript
try {
  // Operation that accepts an abort signal
} catch (err) {
  if (err.name === 'AbortError') {
    // Handle abort case specifically
    console.log('Operation was aborted:', err.message);
  } else {
    // Handle other errors
    console.error('Operation failed:', err);
  }
}
```

## Safe Handling of AbortSignal Parameters

```typescript
function processWithOptionalSignal(options = {}) {
  const { signal } = options;
  
  // Check if signal is valid
  if (signal && !(signal instanceof AbortSignal)) {
    throw new TypeError('Expected options.signal to be an AbortSignal');
  }
  
  // Check if already aborted
  if (signal?.aborted) {
    throw new Error(`Operation aborted: ${signal.reason}`);
  }
  
  // Process with signal
}
```