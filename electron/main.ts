import {
  app, BrowserWindow, screen, ipcMain, Tray, Menu,
  nativeImage, shell, globalShortcut
} from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import {
  getAllItems, deleteItemById, deleteAllClipboard, deleteOldestClipboard,
  insertDocument, getSettings, saveSettings
} from './store'
import { startClipboardPoller, stopClipboardPoller, restoreToClipboard } from './clipboard'
import { startFolderWatcher, stopFolderWatcher, captureScreenshot, pickScreenshotsFolder } from './screenshot'
import { evaluateCursorPosition, getDockWindowBounds } from './triggerZone'
import { IPC } from '../src/types'

// ─── Constants ──────────────────────────────────────────────────────────────
const HIDE_DEBOUNCE_MS = 500  // ms before dock hides after mouse leaves
const MOUSE_POLL_MS = 35      // ms between cursor position checks

// ─── State ──────────────────────────────────────────────────────────────────
let dockWindow: BrowserWindow | null = null
let tray: Tray | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let hideAnimTimer: ReturnType<typeof setTimeout> | null = null
let dockVisible = false
let mousePoller: ReturnType<typeof setInterval> | null = null
let currentDisplay: Electron.Display | null = null

// ─── App Lifecycle ──────────────────────────────────────────────────────────
if (process.env.CLIPPER_USER_DATA) {
  app.setPath('userData', process.env.CLIPPER_USER_DATA)
}

const isE2E = process.env.CLIPPER_E2E === '1'
const gotSingleInstanceLock = isE2E ? true : app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else if (!isE2E) {
  app.on('second-instance', () => {
    if (dockWindow) showDock(screen.getPrimaryDisplay())
  })
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return
  app.setAppUserModelId('com.clipper.app')
  createDockWindow()
  createTray()
  registerGlobalHotkey()
  if (process.env.CLIPPER_E2E !== '1') {
    startMousePoller()
  }
  startClipboardPoller(dockWindow!, () => {
    showDock(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()))
  })
  startFolderWatcher(dockWindow!)
})

app.on('window-all-closed', (e: Event) => {
  // Prevent default quit — Clipper lives in the tray
  e.preventDefault()
})

app.on('before-quit', () => {
  stopClipboardPoller()
  stopFolderWatcher()
  globalShortcut.unregisterAll()
  if (mousePoller) clearInterval(mousePoller)
})

// ─── Dock Window ────────────────────────────────────────────────────────────
function createDockWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const dockBounds = getDockWindowBounds(primaryDisplay.bounds)

  dockWindow = new BrowserWindow({
    width: dockBounds.width,
    height: dockBounds.height,
    x: dockBounds.x,
    y: dockBounds.y,
    useContentSize: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  dockWindow.setAlwaysOnTop(true, 'screen-saver')
  dockWindow.setVisibleOnAllWorkspaces(true)
  dockWindow.setIgnoreMouseEvents(true, { forward: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    dockWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    dockWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  dockWindow.once('ready-to-show', () => {
    // Briefly peek the dock on startup so the user sees it is active, then auto-hide
    showDock(screen.getPrimaryDisplay())
    if (process.env.CLIPPER_E2E !== '1') {
      setTimeout(() => {
        const cursor = screen.getCursorScreenPoint()
        const display = screen.getDisplayNearestPoint(cursor)
        const { inDockArea } = evaluateCursorPosition(cursor, display.bounds)
        if (!inDockArea) hideDock()
      }, 2500)
    }
  })

  dockWindow.webContents.on('did-fail-load', (_event, code, desc) => {
    console.error('Dock failed to load:', code, desc)
  })

  dockWindow.on('closed', () => {
    dockWindow = null
  })
}

// ─── Multi-Monitor Mouse Tracking ───────────────────────────────────────────
function startMousePoller(): void {
  mousePoller = setInterval(() => {
    if (!dockWindow) return

    const cursor = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursor)
    const { inTriggerZone, inDockArea } = evaluateCursorPosition(cursor, display.bounds)

    if (inTriggerZone) {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      showDock(display)
    } else if (dockVisible && !inDockArea) {
      scheduleDockHide()
    }
  }, MOUSE_POLL_MS)
}

function showDock(display: Electron.Display): void {
  if (!dockWindow || dockWindow.isDestroyed()) return

  if (hideAnimTimer) {
    clearTimeout(hideAnimTimer)
    hideAnimTimer = null
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  if (dockVisible && dockWindow.isVisible() && currentDisplay?.id === display.id) return

  if (currentDisplay?.id !== display.id) {
    currentDisplay = display
    const dockBounds = getDockWindowBounds(display.bounds)
    dockWindow.setBounds(dockBounds)
  }

  dockWindow.setIgnoreMouseEvents(false)
  dockWindow.setAlwaysOnTop(true, 'screen-saver')
  dockWindow.showInactive()
  dockWindow.moveTop()
  dockWindow.webContents.send(IPC.DOCK_SHOW)
  dockVisible = true
}

function scheduleDockHide(): void {
  if (hideTimer) return
  hideTimer = setTimeout(() => {
    hideDock()
    hideTimer = null
  }, HIDE_DEBOUNCE_MS)
}

function hideDock(): void {
  if (!dockWindow || dockWindow.isDestroyed() || !dockVisible) return
  dockVisible = false
  dockWindow.webContents.send(IPC.DOCK_HIDE)
  if (hideAnimTimer) clearTimeout(hideAnimTimer)
  // Give animation time to complete before disabling mouse events and hiding
  hideAnimTimer = setTimeout(() => {
    hideAnimTimer = null
    if (dockWindow && !dockWindow.isDestroyed() && !dockVisible) {
      dockWindow.setIgnoreMouseEvents(true, { forward: true })
      dockWindow.hide()
    }
  }, 200)
}

// ─── Tray ────────────────────────────────────────────────────────────────────
function createTray(): void {
  const resDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '../../resources')
  const icoPath = path.join(resDir, 'icon.ico')
  const pngPath = path.join(resDir, 'icon.png')
  let icon = nativeImage.createFromPath(icoPath)
  if (icon.isEmpty()) {
    icon = nativeImage.createFromPath(pngPath)
  }
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Clipper — Hover top-center of screen to open')
  tray.setContextMenu(buildTrayMenu())

  tray.on('click', () => {
    if (dockWindow) {
      showDock(screen.getPrimaryDisplay())
    }
  })

  if (process.platform === 'win32') {
    tray.displayBalloon({
      iconType: 'info',
      title: 'Clipper is running',
      content: 'Hover at the top-center of your screen or click the tray icon.',
    })
  }
}

function buildTrayMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show Clipper',
      click: () => { if (dockWindow) showDock(screen.getPrimaryDisplay()) }
    },
    { type: 'separator' },
    {
      label: 'Clear Clipboard History',
      click: () => {
        deleteAllClipboard()
        dockWindow?.webContents.send(IPC.ITEMS_UPDATED)
      }
    },
    {
      label: 'Pick Screenshots Folder…',
      click: async () => {
        if (dockWindow) await pickScreenshotsFolder(dockWindow)
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => openSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit Clipper',
      click: () => { app.exit(0) }
    },
  ])
}

function openSettingsWindow(): void {
  const win = new BrowserWindow({
    width: 460,
    height: 520,
    title: 'Clipper Settings',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?settings=1`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { query: { settings: '1' } })
  }
}

// ─── Global Hotkey ───────────────────────────────────────────────────────────
function registerGlobalHotkey(): void {
  let hotkey = 'Ctrl+Shift+S'
  try {
    const settings = getSettings()
    hotkey = settings.hotkey || 'Ctrl+Shift+S'
  } catch (err) {
    console.warn('Failed to load settings for hotkey, using default:', err)
  }

  try {
    globalShortcut.register(hotkey, async () => {
      if (dockWindow) await captureScreenshot(dockWindow)
    })
  } catch {
    console.warn(`Failed to register hotkey: ${hotkey}`)
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle(IPC.GET_ITEMS, () => {
  return getAllItems()
})

ipcMain.handle(IPC.COPY_ITEM, (_event, id: number, type: string) => {
  return restoreToClipboard(id, type)
})

ipcMain.handle(IPC.DELETE_ITEM, (_event, id: number, type: string) => {
  deleteItemById(id, type)
})

ipcMain.handle(IPC.DELETE_ALL, () => {
  deleteAllClipboard()
  dockWindow?.webContents.send(IPC.ITEMS_UPDATED)
})

ipcMain.handle(IPC.DELETE_OLDEST, (_event, count: number) => {
  deleteOldestClipboard(count)
  dockWindow?.webContents.send(IPC.ITEMS_UPDATED)
})

ipcMain.handle(IPC.PIN_FILE, (_event, filePath: string) => {
  const item = insertDocument(filePath)
  if (item) {
    dockWindow?.webContents.send(IPC.ITEMS_UPDATED)
    return true
  }
  return false
})

ipcMain.handle(IPC.OPEN_FILE, async (_event, filePath: string) => {
  await shell.openPath(filePath)
})

ipcMain.handle(IPC.CAPTURE_SCREENSHOT, async () => {
  if (!dockWindow) return null
  return captureScreenshot(dockWindow)
})

ipcMain.handle(IPC.PICK_SCREENSHOTS_FOLDER, async () => {
  if (!dockWindow) return null
  return pickScreenshotsFolder(dockWindow)
})

ipcMain.handle(IPC.GET_SETTINGS, () => {
  return getSettings()
})

ipcMain.handle(IPC.OPEN_SETTINGS, () => {
  openSettingsWindow()
})

ipcMain.handle(IPC.HIDE_DOCK, () => {
  hideDock()
})

ipcMain.handle(IPC.SAVE_SETTINGS, (_event, settings: Parameters<typeof saveSettings>[0]) => {
  saveSettings(settings)

  // Re-register hotkey if it changed
  if (settings.hotkey) {
    globalShortcut.unregisterAll()
    registerGlobalHotkey()
  }

  // Restart folder watcher if folder changed
  if (settings.screenshotsFolder && dockWindow) {
    stopFolderWatcher()
    startFolderWatcher(dockWindow)
  }

  // Auto-launch
  if (settings.autoLaunch !== undefined) {
    app.setLoginItemSettings({ openAtLogin: settings.autoLaunch })
  }
})
