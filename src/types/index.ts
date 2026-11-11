// Shared TypeScript types used across main process and renderer

export type ItemType = 'text' | 'image' | 'screenshot' | 'document'

export interface BaseItem {
  id: number
  type: ItemType
  createdAt: number // Unix ms timestamp
}

export interface ClipboardTextItem extends BaseItem {
  type: 'text'
  content: string
  preview: string // first 200 chars
}

export interface ClipboardImageItem extends BaseItem {
  type: 'image'
  dataUrl: string   // base64 PNG
  preview: string   // 'Image'
}

export interface ScreenshotItem extends BaseItem {
  type: 'screenshot'
  filePath: string
  thumbnailDataUrl: string
  filename: string
}

export interface DocumentItem extends BaseItem {
  type: 'document'
  filePath: string
  filename: string
  ext: string
  pinnedAt: number
}

export type ClipperItem = ClipboardTextItem | ClipboardImageItem | ScreenshotItem | DocumentItem

export interface AppSettings {
  hotkey: string           // e.g. 'Ctrl+Shift+S'
  screenshotsFolder: string
  sensitiveApps: string[]  // process names to block clipboard from
  autoLaunch: boolean
  maxItems: number         // always 50
}

// IPC channel names (single source of truth)
export const IPC = {
  GET_ITEMS: 'clipper:getItems',
  COPY_ITEM: 'clipper:copyItem',
  DELETE_ITEM: 'clipper:deleteItem',
  DELETE_ALL: 'clipper:deleteAll',
  DELETE_OLDEST: 'clipper:deleteOldest',
  PIN_FILE: 'clipper:pinFile',
  OPEN_FILE: 'clipper:openFile',
  CAPTURE_SCREENSHOT: 'clipper:captureScreenshot',
  GET_SETTINGS: 'clipper:getSettings',
  SAVE_SETTINGS: 'clipper:saveSettings',
  PICK_SCREENSHOTS_FOLDER: 'clipper:pickScreenshotsFolder',
  OPEN_SETTINGS: 'clipper:openSettings',
  HIDE_DOCK: 'clipper:hideDock',
  // Main → Renderer events
  ITEMS_UPDATED: 'clipper:itemsUpdated',
  HISTORY_FULL: 'clipper:historyFull',
  DOCK_SHOW: 'dock:show',
  DOCK_HIDE: 'dock:hide',
} as const
