import { contextBridge, ipcRenderer } from 'electron'
import type { ClipperItem, AppSettings } from '../src/types'
import { IPC } from '../src/types'

// Expose a typed, secure API to the renderer process
contextBridge.exposeInMainWorld('clipper', {
  // ── Data ──────────────────────────────────────────────────────────────
  getItems: (): Promise<ClipperItem[]> =>
    ipcRenderer.invoke(IPC.GET_ITEMS),

  copyItem: (id: number, type: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.COPY_ITEM, id, type),

  deleteItem: (id: number, type: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_ITEM, id, type),

  deleteAll: (): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_ALL),

  deleteOldest: (count: number): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_OLDEST, count),

  // ── Files ─────────────────────────────────────────────────────────────
  pinFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.PIN_FILE, filePath),

  openFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_FILE, filePath),

  // ── Screenshots ───────────────────────────────────────────────────────
  captureScreenshot: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.CAPTURE_SCREENSHOT),

  pickScreenshotsFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.PICK_SCREENSHOTS_FOLDER),

  // ── Settings ──────────────────────────────────────────────────────────
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.GET_SETTINGS),

  saveSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),

  openSettings: (): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_SETTINGS),

  hideDock: (): Promise<void> =>
    ipcRenderer.invoke(IPC.HIDE_DOCK),

  // ── Event listeners (main → renderer) ────────────────────────────────
  onItemsUpdated: (cb: () => void) => {
    ipcRenderer.on(IPC.ITEMS_UPDATED, cb)
    return () => ipcRenderer.removeListener(IPC.ITEMS_UPDATED, cb)
  },

  onHistoryFull: (cb: () => void) => {
    ipcRenderer.on(IPC.HISTORY_FULL, cb)
    return () => ipcRenderer.removeListener(IPC.HISTORY_FULL, cb)
  },

  onDockShow: (cb: () => void) => {
    ipcRenderer.on(IPC.DOCK_SHOW, cb)
    return () => ipcRenderer.removeListener(IPC.DOCK_SHOW, cb)
  },

  onDockHide: (cb: () => void) => {
    ipcRenderer.on(IPC.DOCK_HIDE, cb)
    return () => ipcRenderer.removeListener(IPC.DOCK_HIDE, cb)
  },
})
