# WAYS

**W**orker, **A**re **Y**ou **S**leeping?

A cross-platform JavaScript library that detects whether browser Developer Tools are open, using a multi-worker heartbeat mechanism with randomized self-healing countermeasures.

## Table of Contents

[中文版](./README.chinese.md)

- [Overview](#overview)
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

## How It Works

WAYS operates on a simple but effective principle: workers send heartbeat messages to the main thread at regular intervals. If a worker is suspended by a debugger statement, its heartbeat stops, and the main thread detects the interruption.

### Architecture

1. Worker Pool Management
   - The library maintains a dynamic set of Web Workers.
   - Each worker runs a tight loop: `setInterval(() => { debugger; postMessage("alive"); }, 100)`.
   - Under normal conditions, each worker sends a heartbeat every 100 milliseconds.

2. Heartbeat Monitoring
   - The main thread tracks the last heartbeat time for each worker.
   - A worker is considered "asleep" if its last heartbeat was received more than 200 milliseconds ago.
   - The `getIsOpenedDevTools()` method returns `true` if any worker is asleep.

3. Self-Healing and Randomization
   - Every 3 seconds, the library randomly dismisses a subset of workers and recruits new ones to replace them.
   - This process is protected by a mutex to ensure consistency between dismissal and recruitment.
   - The randomization makes it difficult for an attacker to establish a stable debugging environment.

4. Graceful Termination
   - When `stopDetecting()` is called, the detection loop exits.
   - All remaining workers are properly dismissed and terminated, preventing resource leaks.

5. Mutex-Protected Operations
   - Both the worker reset operation and the detection read operation are guarded by a mutex.
   - This ensures that the worker pool is never read while it is being modified, preventing inconsistent states.

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

// Set the worker script URL (the library provides ways.worker.js)
await detector.setWorkerAddress('/path/to/ways.worker.js');

// Start detection
detector.startDetecting();

// Check if DevTools is open
const isOpen = await detector.getIsOpenedDevTools();
console.log('DevTools open:', isOpen);

// Stop detection when done
detector.stopDetecting();
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
                setInterval(async () => {
                    const opened = await ways.getIsOpenedDevTools();
                    if (opened) {
                        displayer.innerHTML = "Caught you! You opened Developer Tools!";
                    } else {
                        displayer.innerHTML = "You haven't opened Developer Tools yet. Go ahead!";
                    }
                }, 50);
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
| `setInterval(async () => { ... }, 50)` | Polls the detection status every 50 milliseconds. |
| `await ways.getIsOpenedDevTools()` | Returns `true` if any worker is asleep, indicating DevTools is open. |
| `displayer.innerHTML = ...` | Updates the page to reflect the current detection status. |

The example checks for DevTools every 50 milliseconds, providing near-instant feedback. When DevTools is opened, the detection triggers within at most 200 milliseconds due to the worker heartbeat interval.

### Worker Script

The library provides the worker script (`ways.worker.js`) in the distribution package. You only need to reference it via `setWorkerAddress()`. The worker script implements the heartbeat mechanism:

```javascript
// ways.worker.js (provided by the library)
setInterval(() => {
    debugger;
    postMessage("alive");
}, 100);
```

You do not need to create this file yourself; it is included in the npm package.

## API Reference

### Class: WAYS

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `max_workers` | `number` | `10` | Maximum number of workers in the pool |
| `dismissed_workers` | `number` | `1` | Number of workers to dismiss and recruit in each reset cycle |

#### Methods

##### `setWorkerAddress(workerAddress: string): Promise<void>`

Sets the URL of the worker script. This method validates that the script is accessible before resolving.

- `workerAddress`: The absolute or relative URL to the worker JavaScript file (typically `ways.worker.js`).
- Returns: A promise that resolves when the worker script is successfully fetched, or rejects if the script cannot be loaded.

##### `startDetecting(): void`

Starts the detection loop. This method initializes the worker pool and begins the periodic reset cycle.

- The method spawns `max_workers` workers immediately.
- Every 3 seconds, it randomly dismisses `dismissed_workers` workers and recruits the same number of new workers.
- The detection loop continues until `stopDetecting()` is called.

##### `stopDetecting(): void`

Stops the detection loop and dismisses all remaining workers.

- The detection loop exits gracefully.
- All workers in the pool are terminated via `dismiss()`.
- This prevents resource leaks and ensures proper cleanup.

##### `getIsOpenedDevTools(): Promise<boolean>`

Checks whether any worker is currently asleep.

- Returns: `true` if any worker has not sent a heartbeat for more than 200 milliseconds, `false` otherwise.
- This method is mutex-protected and will wait if a reset operation is in progress.

##### `get lastError(): Error | undefined`

Returns the last error encountered during detection, if any.

### Class: WWorker

Internal class representing an individual worker. Not intended for direct use.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `sleeped` | `boolean` | `true` if the worker's last heartbeat was more than 200ms ago |

#### Methods

##### `dismiss(): void`

Terminates the worker and sends a dismissal message.

## Defense Mechanisms

WAYS employs multiple layers of defense that make bypassing the detection impractical for most users.

### Multi-Worker Heartbeat

The library uses up to 10 simultaneous workers, each sending heartbeats independently. Disabling or killing a single worker does not stop the detection; the remaining workers will continue to report.

### Random Self-Healing

Every 3 seconds, the worker pool is partially reset. Workers are randomly selected for dismissal and replaced with new workers. This has several effects:

- An attacker cannot simply identify and disable all workers because new ones are constantly being created.
- The randomization makes the detection pattern non-deterministic, frustrating attempts to reverse-engineer the behavior.
- Each new worker starts its own independent heartbeat cycle, introducing fresh debugger breakpoints.

### Debugger Proliferation

Each worker contains a `debugger` statement in its heartbeat loop. When DevTools is open with breakpoints enabled:

- Every 100 milliseconds, each active worker hits a `debugger` statement.
- The user must manually resume execution for each worker, repeatedly.
- Because workers are reset every 3 seconds, new workers introduce additional `debugger` breakpoints.

Even with breakpoints disabled, the user must repeatedly click "Continue" to allow the workers to proceed, and the reset cycle reintroduces new breakpoints over time.

### Graceful Termination

When `stopDetecting()` is called:

- The detection loop exits immediately.
- All workers are properly dismissed and terminated.
- This ensures that no resources are leaked and the application can clean up without leaving orphaned workers.

### Mutex Protection

Critical sections of the code are protected by a mutex, ensuring:

- Worker pool modifications (dismissal and recruitment) are atomic.
- Detection reads are isolated from ongoing modifications.
- No race conditions can be exploited to read an inconsistent state.

## Known Limitations

### Breakpoint Disabling

If the user manually disables breakpoints in DevTools, the `debugger` statements in the workers will not pause execution. However:

- The user must keep DevTools open and manually resume execution repeatedly.
- The reset cycle introduces new workers with fresh `debugger` breakpoints every 3 seconds.
- Most users will find this sufficiently frustrating to abandon debugging attempts.

### JavaScript Disabled

If JavaScript is completely disabled, the library cannot execute at all. However, in that scenario, DevTools is also largely useless for debugging the application, as the page itself will not function.

### Performance Impact

The library spawns up to 10 workers, each running a 100ms interval. This has a minimal performance footprint under normal conditions. However, when DevTools is open and breakpoints are enabled, the repeated breakpoints may cause noticeable UI lag as the user clicks "Continue" repeatedly.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
