# WAYS

**W**orker, **A**re **Y**ou **S**leeping?

A cross-platform JavaScript library that detects whether browser Developer Tools are open, using a multi-worker heartbeat mechanism with randomized self-healing countermeasures.

**GitHub**: [https://github.com/PerfectMYGHY/WAYS](https://github.com/PerfectMYGHY/WAYS)  
**npm**: [https://www.npmjs.com/package/@perfectghy/ways](https://www.npmjs.com/package/@perfectghy/ways)

## Table of Contents

[中文版](./README.chinese.md)

- [Overview](#overview)
- [Breaking Changes in v2.0.0](#breaking-changes-in-v200)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Defense Mechanisms](#defense-mechanisms)
- [Known Limitations](#known-limitations)
- [License](#license)

## Overview

WAYS is a TypeScript library designed to detect if Developer Tools are open in a browser. Unlike traditional detection methods that rely on single-point debugger statements or timing attacks, WAYS employs a distributed, self-healing worker pool that makes bypassing the detection extremely difficult for an average user.

The library is stable across all major browsers and platforms because it uses only standard Web APIs. No hacks, no non-standard features, no browser-specific exploits.

## Breaking Changes in v2.0.0

> **Version 2.0.0 introduces a completely new event-driven API.** The polling-based `getIsOpenedDevTools()` method has been removed.

This major version also fixes false positive detection issues that were inherent in the 1.x polling-based architecture. The new event-driven architecture properly differentiates between transient heartbeat delays and genuine DevTools suspension states.

### Migration Guide

**v1.x (polling):**

```typescript
const detector = new WAYS();
await detector.setWorkerAddress('/path/to/ways.worker.js');
detector.startDetecting();

// Poll every 50ms
setInterval(async () => {
  const isOpen = await detector.getIsOpenedDevTools();
  if (isOpen) {
    console.log('DevTools is open!');
  }
}, 50);
```

**v2.0.0 (event-driven):**

```typescript
const detector = new WAYS();
await detector.setWorkerAddress('/path/to/ways.worker.js');

// Listen to events
detector.on('devToolsOpened', () => {
  console.log('DevTools is open!');
});

detector.on('devToolsClosed', () => {
  console.log('DevTools is closed.');
});

detector.startDetecting();
```

**Key Differences:**

- `getIsOpenedDevTools()` → **REMOVED**
- Replace polling with event listeners: `devToolsOpened` and `devToolsClosed`
- No need to manually poll; events fire automatically when state changes
- Detection latency remains ≤ 200ms

## How It Works

WAYS operates on a simple but effective principle: workers send heartbeat messages to the main thread at regular intervals. If a worker is suspended by a debugger statement, its heartbeat stops, and the main thread detects the interruption.

### Architecture

1. Worker Pool Management
   - The library maintains a dynamic set of Web Workers.
   - Each worker runs a tight loop: `setInterval(() => { debugger; postMessage("alive"); }, 50)`.
   - Under normal conditions, each worker sends a heartbeat every 50 milliseconds.

2. Heartbeat Monitoring
   - The main thread tracks the last heartbeat time for each worker.
   - A worker is considered "asleep" if its last heartbeat was received more than `internalTimeout` milliseconds ago (default: 200ms).
   - When a worker falls asleep, the `devToolsOpened` event is emitted.
   - When a worker wakes up, the `devToolsClosed` event is emitted.

3. Self-Healing and Randomization
   - Every 5 seconds, the library randomly dismisses a subset of workers and recruits new ones to replace them.
   - The randomization makes it difficult for an attacker to establish a stable debugging environment.

4. Graceful Termination
   - When `stopDetecting()` is called, the detection loop exits.
   - All remaining workers are properly dismissed and terminated, preventing resource leaks.

## Installation

Using npm:

```bash
npm install @perfectghy/ways
```

Using yarn:

```bash
yarn add @perfectghy/ways
```

## Usage

### Basic Example

```typescript
import WAYS from '@perfectghy/ways';

// Create an instance
const detector = new WAYS();

// Configure before starting (optional)
detector.max_workers = 8;
detector.dismissed_workers = 2;
detector.internalTimeout = 300;

// Set the worker script URL (the library provides ways.worker.js)
await detector.setWorkerAddress('/path/to/ways.worker.js');

// Listen to state changes
detector.on('devToolsOpened', () => {
  console.log('Developer Tools opened!');
});

detector.on('devToolsClosed', () => {
  console.log('Developer Tools closed.');
});

// Start detection
detector.startDetecting();

// Stop detection when done
// detector.stopDetecting();
```

### HTML Example (Standalone)

A complete HTML test page is provided below. This example demonstrates how to include the library via script tag and use it to detect DevTools in real time.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WAYS Test Page</title>
</head>
<body>
    <script src="dist/ways.js"></script>
    <p>I can detect whether you have opened the console, with a delay no greater than 200ms.</p>
    <p id="result">Detecting...</p>
    <script>
        const ways = new WAYS();
        ways.setWorkerAddress("dist/ways.worker.js")
            .then(() => {
                ways.startDetecting();
                const displayer = document.getElementById("result");
                ways.on('devToolsOpened', () => {
                    displayer.innerHTML = "Caught you! You opened Developer Tools!";
                });
                ways.on('devToolsClosed', () => {
                    displayer.innerHTML = "You haven't opened Developer Tools yet. Go ahead!";
                });
            });
    </script>
</body>
</html>
```

**Explanation of the example:**

| Line | Description |
|------|-------------|
| `<script src="dist/ways.js"></script>` | Loads the compiled WAYS library from the distribution directory. |
| `const ways = new WAYS();` | Creates a new detector instance. |
| `ways.setWorkerAddress("dist/ways.worker.js")` | Configures the worker script location (the library provides this file) and verifies it is accessible. |
| `ways.startDetecting()` | Starts the worker pool and the detection loop. |
| `ways.on('devToolsOpened', ...)` | Registers a callback that fires immediately when DevTools is opened. |
| `ways.on('devToolsClosed', ...)` | Registers a callback that fires immediately when DevTools is closed. |

The event-driven approach provides instant feedback without manual polling. When DevTools is opened, the event fires within at most 200 milliseconds.

### Worker Script

The library provides the worker script (`ways.worker.js`) in the distribution package. You only need to reference it via `setWorkerAddress()`. The worker script implements the heartbeat mechanism:

```javascript
// ways.worker.js (provided by the library)
setInterval(() => {
    debugger;
    postMessage("alive");
}, 50);
```

You do not need to create this file yourself; it is included in the npm package.

## API Reference

### Class: WAYS

The WAYS class extends `EventEmitter`, so all standard event methods (`on`, `once`, `off`, `emit`, etc.) are available.

#### Events

| Event | Description |
|-------|-------------|
| `devToolsOpened` | Emitted when Developer Tools is detected as open. |
| `devToolsClosed` | Emitted when Developer Tools is detected as closed. |

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `max_workers` | `number` | `5` | Maximum number of workers in the pool. Must be set before calling `startDetecting()`. |
| `dismissed_workers` | `number` | `0` | Number of workers to dismiss and recruit in each reset cycle. Set this to control churn rate. Can be modified before or during detection (takes effect on next reset cycle). |
| `internalTimeout` | `number` | `200` | Timeout in milliseconds after which a worker is considered asleep. Must be set before calling `startDetecting()`. |

#### Configuration Notes

The `max_workers`, `dismissed_workers`, and `internalTimeout` properties are public and can be modified directly:

```typescript
const detector = new WAYS();

// Configure before starting
detector.max_workers = 8;
detector.dismissed_workers = 2;
detector.internalTimeout = 300;

await detector.setWorkerAddress('/path/to/ways.worker.js');
detector.startDetecting();
```

- `max_workers` and `internalTimeout` must be set **before** calling `startDetecting()`.
- `dismissed_workers` can be changed at any time; the new value takes effect in the next reset cycle.
- Changing `max_workers` after detection has started will not affect the current pool size.

#### Methods

##### `setWorkerAddress(workerAddress: string): Promise<void>`

Sets the URL of the worker script. This method validates that the script is accessible before resolving.

- `workerAddress`: The absolute or relative URL to the worker JavaScript file (typically `ways.worker.js`).
- Returns: A promise that resolves when the worker script is successfully fetched, or rejects if the script cannot be loaded.

##### `startDetecting(): void`

Starts the detection loop. This method initializes the worker pool and begins the periodic reset cycle.

- The method spawns `max_workers` workers immediately.
- Every 5 seconds, it randomly dismisses `dismissed_workers` workers and recruits the same number of new workers.
- The detection loop continues until `stopDetecting()` is called.
- Events (`devToolsOpened`/`devToolsClosed`) will be emitted automatically based on worker heartbeat status.

##### `stopDetecting(): void`

Stops the detection loop and dismisses all remaining workers.

- The detection loop exits gracefully.
- All workers in the pool are terminated.
- This prevents resource leaks and ensures proper cleanup.

##### `get lastError(): Error | undefined`

Returns the last error encountered during detection, if any.

#### Events (Detailed)

| Event | Payload | When emitted |
|-------|---------|--------------|
| `devToolsOpened` | none | When any worker fails to send a heartbeat within `internalTimeout` ms |
| `devToolsClosed` | none | When all workers resume sending heartbeats normally |

### Class: WWorker

Internal class representing an individual worker. Not intended for direct use.

## Defense Mechanisms

WAYS employs multiple layers of defense that make bypassing the detection impractical for most users.

### Multi-Worker Heartbeat

The library uses up to 5 simultaneous workers (configurable via `max_workers`), each sending heartbeats independently. Disabling or killing a single worker does not stop the detection; the remaining workers will continue to report.

### Random Self-Healing

Every 5 seconds, the worker pool is partially reset. Workers are randomly selected for dismissal and replaced with new workers. This has several effects:

- An attacker cannot simply identify and disable all workers because new ones are constantly being created.
- The randomization makes the detection pattern non-deterministic, frustrating attempts to reverse-engineer the behavior.
- Each new worker starts its own independent heartbeat cycle, introducing fresh debugger breakpoints.

### Debugger Proliferation

Each worker contains a `debugger` statement in its heartbeat loop. When DevTools is open with breakpoints enabled:

- Every 50 milliseconds, each active worker hits a `debugger` statement.
- The user must manually resume execution for each worker, repeatedly.
- Because workers are reset every 5 seconds, new workers introduce additional `debugger` breakpoints.

Even with breakpoints disabled, the user must repeatedly click "Continue" to allow the workers to proceed, and the reset cycle reintroduces new breakpoints over time.

### Graceful Termination

When `stopDetecting()` is called:

- The detection loop exits immediately.
- All workers are properly dismissed and terminated.
- This ensures that no resources are leaked and the application can clean up without leaving orphaned workers.

## Known Limitations

### Breakpoint Disabling

If the user manually disables breakpoints in DevTools, the `debugger` statements in the workers will not pause execution. However:

- The user must keep DevTools open and manually resume execution repeatedly.
- The reset cycle introduces new workers with fresh `debugger` breakpoints every 5 seconds.
- Most users will find this sufficiently frustrating to abandon debugging attempts.

### JavaScript Disabled

If JavaScript is completely disabled, the library cannot execute at all. However, in that scenario, DevTools is also largely useless for debugging the application, as the page itself will not function.

### Performance Impact

The library spawns up to 5 workers (default), each running a 50ms interval. This has a minimal performance footprint under normal conditions. However, when DevTools is open and breakpoints are enabled, the repeated breakpoints may cause noticeable UI lag as the user clicks "Continue" repeatedly.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
