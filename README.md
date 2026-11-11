# Clipper

A lightweight **Windows 10/11** top-center floating dock widget for instant access to your clipboard history, screenshots, and pinned files.

Clipper stays hidden in the system tray until you move your cursor to the **top-center edge of any monitor**, sliding down a compact floating dock with zero taskbar clutter.

---

## Features

- **Top-Center Hover Dock (Multi-Monitor)** — Automatically follows your cursor across displays and reveals the centered dock (`900px` max width) when hovering within the top-center trigger zone (`16px` top strip, middle `40%` width), then auto-hides after `500ms` when your cursor leaves.
- **Smart Clipboard History** — Captures copied text and images into local SQLite storage (`clipper.db`), lets you click any card to copy it back, and automatically skips sensitive entries (API keys, private keys, JWTs, password manager formats, and configured apps).
- **50-Item Soft Cap Prompt** — Prompts inside the dock when clipboard history reaches 50 items so you can clear the oldest 25 or clear all without losing pinned files or screenshots.
- **Screenshots (`Ctrl+Shift+S` / Snap)** — Captures desktop screenshots via a global shortcut or the toolbar **Snap** button, generates thumbnails, and watches a user-selected screenshots folder.
- **Drag-and-Drop Pinned Documents** — Drag files directly onto the dock to pin them with extension-accented cards for one-click opening.
- **Search, Filters & Tray Controls** — Filter by `All`, `Text`, `Images`, `Shots`, or `Docs`, search inline, and manage settings or history from the Windows system tray.

---

## Tech Stack

- **Desktop & Packaging**: Electron 29, `electron-vite`, `electron-builder` (NSIS Windows installer)
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Native / Storage**: `better-sqlite3`, `sharp`, `screenshot-desktop`
- **Testing**: Vitest (`jsdom` + React Testing Library) and Playwright (Electron E2E)

---

## Getting Started

### Prerequisites

- **Windows 10 or Windows 11**
- **Node.js** 20+
- **pnpm**

### Install & Run in Development

```powershell
pnpm install
pnpm dev
```

### Build & Package Windows Installer

```powershell
pnpm build
pnpm dist
```

Packaged outputs are generated in `dist/` (`Clipper Setup 0.1.0.exe` and `dist/win-unpacked/Clipper.exe`).

---

## Available Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start Electron + Vite in development mode |
| `pnpm build` | Build main, preload, and renderer bundles (`out/`) |
| `pnpm dist` | Build production bundles and package Windows NSIS installer (`dist/`) |
| `pnpm test` | Run Vitest unit and component tests |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm test:e2e` | Run Playwright Electron end-to-end tests |
| `pnpm lint` | Run ESLint across TypeScript/TSX files |

---

## Project Structure

```text
clipper/
├── electron/               # Main process, preload, SQLite store, pollers & trigger zone
│   └── __tests__/          # Main-process unit tests
├── src/                    # React dock UI, Zustand store & settings window
│   ├── components/         # Dock, Toolbar, Cards, HistoryFullModal, SettingsWindow
│   └── __tests__/          # Renderer component & store tests
├── e2e/                    # Playwright Electron end-to-end tests
├── resources/              # App icons (.ico / .png)
└── scripts/                # Test runner helpers
```

---

## License

MIT
