import { clipboard, BrowserWindow, nativeImage } from 'electron'
import { insertClipboardText, insertClipboardImage, getSettings, isHistoryFull, getDb } from './store'
import { isSensitiveContent } from './sensitiveFilter'
import { IPC } from '../src/types'

let lastTextHash = ''
let lastImageHash = ''
let pollInterval: ReturnType<typeof setInterval> | null = null
let onHistoryFullCallback: (() => void) | null = null

/**
 * Start the clipboard polling loop (runs in main process only).
 * @param win - The dock BrowserWindow to send IPC events to
 * @param onHistoryFull - Optional callback invoked when the 50-item cap is reached
 */
export function startClipboardPoller(win: BrowserWindow, onHistoryFull?: () => void): void {
  if (pollInterval) return // already running
  onHistoryFullCallback = onHistoryFull ?? null

  pollInterval = setInterval(() => {
    checkClipboard(win)
  }, 500)
}

export function stopClipboardPoller(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function checkClipboard(win: BrowserWindow): void {
  try {
    const availableFormats = clipboard.availableFormats()

    // Check image first (more specific)
    if (availableFormats.includes('image/png') || availableFormats.includes('image/bmp')) {
      const image = clipboard.readImage()
      if (!image.isEmpty()) {
        // Hash raw bitmap slice before paying the cost of PNG encoding
        const bitmap = typeof image.toBitmap === 'function' ? image.toBitmap() : null
        const quickHash = bitmap
          ? simpleHash(bitmap.subarray(0, 1024).toString('base64') + bitmap.length)
          : simpleHash(image.toDataURL().slice(0, 500))

        if (quickHash !== lastImageHash) {
          lastImageHash = quickHash
          lastTextHash = '' // reset text hash when image changes

          if (isHistoryFull()) {
            win.webContents.send(IPC.HISTORY_FULL)
            onHistoryFullCallback?.()
            return
          }

          const dataUrl = image.toDataURL()
          insertClipboardImage(dataUrl)
          notifyUpdated(win)
        }
        return
      }
    }

    // Check text
    const text = clipboard.readText()
    if (text && text.trim().length > 0) {
      const hash = simpleHash(text)

      if (hash !== lastTextHash) {
        lastTextHash = hash
        lastImageHash = '' // reset image hash when text changes

        // Run sensitive filter
        const settings = getSettings()
        if (isSensitiveContent(text, undefined, settings.sensitiveApps)) {
          return // silently skip
        }

        if (isHistoryFull()) {
          win.webContents.send(IPC.HISTORY_FULL)
          onHistoryFullCallback?.()
          return
        }

        insertClipboardText(text)
        notifyUpdated(win)
      }
    }
  } catch {
    // Clipboard can throw on Windows when another app holds exclusive access
  }
}

function notifyUpdated(win: BrowserWindow): void {
  if (!win.isDestroyed()) {
    win.webContents.send(IPC.ITEMS_UPDATED)
  }
}

/** Fast non-cryptographic hash for change detection */
export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/** Re-copy an item back to the system clipboard */
export function restoreToClipboard(id: number, type: string): boolean {
  const db = getDb()
  try {
    if (type === 'text') {
      const row = db.prepare('SELECT content FROM clipboard_items WHERE id = ?').get(id) as { content: string } | undefined
      if (row) {
        clipboard.writeText(row.content)
        // Update lastTextHash to avoid re-capturing the item we just wrote
        lastTextHash = simpleHash(row.content)
        return true
      }
    } else if (type === 'image') {
      const row = db.prepare('SELECT data_url FROM clipboard_items WHERE id = ?').get(id) as { data_url: string } | undefined
      if (row) {
        const img = nativeImage.createFromDataURL(row.data_url)
        clipboard.writeImage(img)
        lastImageHash = simpleHash(row.data_url.slice(0, 500))
        return true
      }
    }
  } catch {
    // ignore
  }
  return false
}
