# Implementation Plan: Clipper

## Capability Map

| Module ID | Responsibility | Depends On |
|---|---|---|
| `scaffold` | Project setup, electron-vite, tsconfig, Tailwind, pnpm workspace | — |
| `storage` | SQLite schema, CRUD for clipboard/screenshot/document items, 50-item cap logic | `scaffold` |
| `ipc` | contextBridge preload API surface — typed channels between main ↔ renderer | `scaffold` |
| `shell` | Frameless window, always-on-top, mouse tracking, dock show/hide animation, multi-monitor | `ipc` |
| `tray` | System tray icon, right-click menu, settings window | `ipc`, `shell` |
| `clipboard-mgr` | Clipboard polling (500 ms), dedup, sensitive-data filter, write to storage | `storage`, `ipc` |
| `screenshot-mgr` | Folder-picker permission dialog, fs.watch on folder, global hotkey capture, thumbnails | `storage`, `ipc` |
| `doc-pinboard` | Drag-and-drop onto dock, file pinning, persistent pins, open-with-default-app | `storage`, `ipc` |
| `ui-dock` | React dock container, card components, scroll, 50-item prompt, search/filter bar | `ipc`, `shell` |
| `settings-ui` | Settings window/panel: hotkey, screenshots folder, max items, sensitive filter list | `tray`, `storage` |

**Build order:**
```
scaffold → storage → ipc → shell → tray
                         ↓
              clipboard-mgr → screenshot-mgr → doc-pinboard
                         ↓
                      ui-dock → settings-ui
```

---

## Phase 1 — Foundation (scaffold + storage + ipc)

**Goal:** Runnable Electron app with SQLite wired up and a typed IPC bridge.

### Tasks

- [ ] **1.1** Init project with `electron-vite`, React 18, TypeScript, Tailwind CSS, pnpm
  - Acceptance: `pnpm dev` launches a bare Electron window
  - Verify: Window appears, no console errors
  - Files: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`

- [ ] **1.2** Define SQLite schema (better-sqlite3)
  - Tables: `clipboard_items`, `screenshot_items`, `document_items`, `settings`
  - Acceptance: Schema created on first run; migration guard prevents duplicate creation
  - Verify: `pnpm test` passes unit test that opens DB and reads schema
  - Files: `electron/store.ts`, `electron/__tests__/store.test.ts`

- [ ] **1.3** Implement contextBridge preload IPC surface
  - Channels: `clipper:getItems`, `clipper:copyItem`, `clipper:deleteItem`, `clipper:pinFile`, `clipper:captureScreenshot`, `clipper:openFile`, `clipper:getSettings`, `clipper:saveSettings`
  - Acceptance: All channels registered; renderer-side types exported
  - Verify: Unit test sends mock IPC and receives expected shape
  - Files: `electron/preload.ts`, `src/types/ipc.ts`

---

## Phase 2 — Shell & Tray (shell + tray)

**Goal:** Invisible dock window that slides down on hover; tray icon with menu.

### Tasks

- [ ] **2.1** Create frameless always-on-top transparent dock window
  - Acceptance: Window spans full screen width, 0px height when hidden, `setIgnoreMouseEvents(true)` when collapsed
  - Verify: Window appears in taskbar/process list; screen reader sees nothing when hidden
  - Files: `electron/main.ts`

- [ ] **2.2** Multi-monitor mouse tracking + dock trigger
  - Poll `screen.getCursorScreenPoint()` every 100 ms
  - Trigger: cursor in top 5px of any display, center 30% of that display's width
  - Move dock window to correct display on trigger
  - Acceptance: Moving mouse to top-center of secondary monitor shows dock on that monitor
  - Verify: Manual test on dual-monitor setup; unit test for trigger-zone calculation
  - Files: `electron/main.ts`, `electron/__tests__/triggerZone.test.ts`

- [ ] **2.3** Dock show/hide animation (IPC → renderer CSS transition)
  - Main sends `dock:show` / `dock:hide` → renderer toggles CSS class
  - Acceptance: Smooth 200 ms slide-down/up; no jank on repeated triggers
  - Files: `electron/main.ts`, `src/App.tsx`, `src/components/Dock.tsx`

- [ ] **2.4** System tray icon + right-click menu
  - Menu items: Show Clipper, Clear History, Settings, Quit
  - Acceptance: Tray icon visible in Windows system tray; all menu items functional
  - Files: `electron/main.ts`, `resources/icon.png`

---

## Phase 3 — Clipboard Manager (clipboard-mgr)

**Goal:** Auto-capture clipboard changes, filter sensitive data, persist and display.

### Tasks

- [ ] **3.1** Clipboard polling loop (main process)
  - 500 ms `setInterval`; detect text and image changes via `clipboard` module
  - Deduplication: skip if content identical to last captured item
  - Acceptance: New clipboard item appears in DB within 1 second of copy
  - Files: `electron/clipboard.ts`, `electron/__tests__/clipboard.test.ts`

- [ ] **3.2** Sensitive data filter
  - Heuristic detection: items matching password-manager process names (`Bitwarden`, `1Password`, `KeePass`, `LastPass`, `Dashlane`) are skipped
  - Pattern matching: items matching common secret patterns (API keys, JWT tokens) are skipped
  - Acceptance: Copying from Bitwarden does not add item to DB
  - Files: `electron/clipboard.ts`, `electron/sensitiveFilter.ts`

- [ ] **3.3** 50-item cap enforcement
  - On insert: if `COUNT(*) >= 50`, emit `clipper:historyFull` IPC event to renderer
  - Renderer shows in-dock modal: "You've reached 50 items. Clear oldest 25 or Clear All?"
  - Acceptance: Modal appears at 50 items; chosen action clears correctly
  - Files: `electron/store.ts`, `src/components/HistoryFullModal.tsx`

- [ ] **3.4** ClipboardCard UI component
  - Shows: type icon (text/image), truncated preview (120px), relative timestamp
  - Click → `clipper:copyItem` IPC → re-copies to clipboard → brief "Copied!" toast
  - Acceptance: Clicking card restores clipboard content; toast visible for 1.5 s
  - Files: `src/components/ClipboardCard.tsx`, `src/__tests__/ClipboardCard.test.tsx`

---

## Phase 4 — Screenshot Manager (screenshot-mgr)

**Goal:** Watch a user-chosen folder + hotkey capture; show thumbnails in dock.

### Tasks

- [ ] **4.1** Screenshots folder picker + permission dialog
  - On first use: show `dialog.showOpenDialog` folder picker
  - Save path to `settings` table
  - Acceptance: First launch shows picker; subsequent launches use saved path; user can change in settings
  - Files: `electron/screenshot.ts`, `electron/store.ts`

- [ ] **4.2** Folder watcher (`fs.watch`)
  - Watch configured folder for new `.png`/`.jpg`/`.gif`/`.bmp` files
  - On new file: generate thumbnail (resize to 160×90), insert into DB, emit IPC
  - Acceptance: Screenshot saved to folder appears in dock within 2 s
  - Files: `electron/screenshot.ts`

- [ ] **4.3** Global hotkey capture (`Ctrl+Shift+S`)
  - `globalShortcut.register` → `screenshot-desktop` → save to screenshots folder → triggers watcher
  - Acceptance: Hotkey works when Clipper is in background; file saved and appears in dock
  - Files: `electron/screenshot.ts`, `electron/main.ts`

- [ ] **4.4** ScreenshotCard UI component
  - Shows: thumbnail image, filename, timestamp
  - Click → `clipper:openFile` → opens in default Windows viewer
  - Files: `src/components/ScreenshotCard.tsx`

---

## Phase 5 — Document Pinboard (doc-pinboard)

**Goal:** Drag-and-drop files onto dock, persist pins, open with default app.

### Tasks

- [ ] **5.1** Drag-and-drop file acceptance on dock window
  - `ondragover` + `ondrop` on renderer; extract file paths; send via IPC
  - Main process validates path exists and is a file (not a folder)
  - Acceptance: Dragging a PDF onto dock pins it; card appears immediately
  - Files: `src/components/Dock.tsx`, `electron/main.ts`

- [ ] **5.2** DocumentCard UI component
  - Shows: file-type icon (resolved from extension), filename (truncated), pinned date
  - Click → `clipper:openFile`
  - Right-click context menu → Unpin
  - Acceptance: Card opens file; Unpin removes from dock and DB
  - Files: `src/components/DocumentCard.tsx`

---

## Phase 6 — UI Polish & Settings (ui-dock + settings-ui)

**Goal:** Search/filter bar, settings panel, final visual polish.

### Tasks

- [ ] **6.1** Dock Toolbar — search/filter
  - Text input filters visible cards by content/filename in real-time
  - Type filter tabs: All | Clipboard | Screenshots | Documents
  - Files: `src/components/Toolbar.tsx`

- [ ] **6.2** Settings window
  - Fields: Global hotkey, Screenshots folder (re-pick), Max items (read-only: 50), Sensitive app list (editable)
  - Save → `clipper:saveSettings` IPC
  - Files: `src/components/SettingsWindow.tsx`, `electron/main.ts`

- [ ] **6.3** Visual polish pass
  - Glassmorphism dock background (backdrop-blur + semi-transparent)
  - Card hover states, smooth scroll
  - App icon (`resources/icon.png`)
  - Acceptance: Matches design intent — premium, minimal, unobtrusive

- [ ] **6.4** Auto-launch at Windows startup (opt-in in Settings)
  - `app.setLoginItemSettings({ openAtLogin: true/false })`
  - Files: `electron/main.ts`, `src/components/SettingsWindow.tsx`

---

## Phase 7 — Testing & Packaging

### Tasks

- [ ] **7.1** Unit test suite (Vitest) — 80% coverage on `store.ts`, `clipboard.ts`, `sensitiveFilter.ts`, `screenshot.ts`
- [ ] **7.2** Component tests (@testing-library/react) for all card components and modals
- [ ] **7.3** E2E test (Playwright Electron) — dock show/hide, clipboard flow, pin file
- [ ] **7.4** Package as Windows installer with `electron-builder`
  - Output: `dist/Clipper Setup x.x.x.exe` (NSIS installer)
  - Files: `electron-builder.yml`

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Mouse polling drains CPU | Medium | Poll at 100 ms max; use `setIgnoreMouseEvents` aggressively |
| Clipboard polling catches sensitive data | High | Sensitive filter (Task 3.2) must land before 3.1 ships |
| `better-sqlite3` native module rebuild for Electron | Medium | Use `electron-rebuild` as postinstall step |
| Screenshot folder permission denied | Low | Catch EACCES; fall back to picker again |
| Drag-and-drop blocked by Windows UAC | Low | Test explicitly; document known limitation |
