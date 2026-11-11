# Clipper — Task List

## Phase 1: Foundation
- [x] 1.1 Init project (electron-vite, React, TS, Tailwind, pnpm)
- [x] 1.2 SQLite schema (better-sqlite3)
- [x] 1.3 contextBridge preload IPC surface

## Phase 2: Shell & Tray
- [x] 2.1 Frameless always-on-top transparent dock window
- [x] 2.2 Multi-monitor mouse tracking + dock trigger
- [x] 2.3 Dock show/hide animation
- [x] 2.4 System tray icon + right-click menu

## Phase 3: Clipboard Manager
- [x] 3.1 Clipboard polling loop (main process)
- [x] 3.2 Sensitive data filter
- [x] 3.3 50-item cap + "Clear History" modal
- [x] 3.4 ClipboardCard UI component

## Phase 4: Screenshot Manager
- [x] 4.1 Screenshots folder picker + permission dialog
- [x] 4.2 Folder watcher (fs.watch)
- [x] 4.3 Global hotkey capture (Ctrl+Shift+S)
- [x] 4.4 ScreenshotCard UI component

## Phase 5: Document Pinboard
- [x] 5.1 Drag-and-drop file acceptance
- [x] 5.2 DocumentCard UI component (with Unpin)

## Phase 6: UI Polish & Settings
- [x] 6.1 Dock Toolbar — search + type filter tabs
- [x] 6.2 Settings window
- [x] 6.3 Visual polish (glassmorphism, animations)
- [x] 6.4 Auto-launch at startup (opt-in)

## Phase 7: Testing & Packaging
- [x] 7.1 Unit tests — 80% coverage (95.4% lines, 100% functions)
- [x] 7.2 Component tests
- [x] 7.3 E2E tests (Playwright Electron — 4/4 passing)
- [x] 7.4 Package as Windows installer (NSIS — dist/Clipper Setup 0.1.0.exe)
