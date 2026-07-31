# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-07-31

### Breaking Changes

- Complete API redesign: Migrated from polling-based to event-driven architecture
- Removed: `getIsOpenedDevTools()` method
- Added: Event-based detection via `devToolsOpened` and `devToolsClosed` events
- Changed: `max_workers` default from 10 to 5
- Changed: Worker reset cycle from 3s to 5s

### Added

- EventEmitter support (extends `eventemitter3`)
- `devToolsOpened` event - fires immediately when DevTools is detected
- `devToolsClosed` event - fires immediately when DevTools is closed
- `internalTimeout` configurable property (default: 200ms)
- Automatic state change detection without manual polling

### Changed

- Worker heartbeat interval reduced from 100ms to 50ms for faster detection response
- Detection logic now uses event-driven state tracking instead of polling-based checks

### Fixed

- Fixed false positive detection issues that were inherent in the 1.x polling-based architecture
- The new event-driven architecture properly differentiates between transient heartbeat delays and genuine DevTools suspension states

### Removed

- `getIsOpenedDevTools()` method (use events instead)
- Mutex protection (simplified internal architecture)

### Migration

```typescript
// Before (v1.x)
const isOpen = await detector.getIsOpenedDevTools();

// After (v2.0.0)
detector.on('devToolsOpened', () => { /* handle */ });
detector.on('devToolsClosed', () => { /* handle */ });
```

---

The versions before 2.0.0 have no change logs.
