import { dialog, BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { insertScreenshot, getSettings, saveSettings } from './store'
import { IPC } from '../src/types'

let watcher: fs.FSWatcher | null = null

/**
 * On first use, prompt the user to pick a screenshots folder.
 * Returns the chosen path, or null if cancelled.
 */
export async function pickScreenshotsFolder(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose your Screenshots folder',
    message: 'Clipper will watch this folder for new screenshots',
    properties: ['openDirectory'],
    defaultPath: path.join(app.getPath('pictures'), 'Screenshots'),
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const chosen = result.filePaths[0]
  saveSettings({ screenshotsFolder: chosen })
  startFolderWatcher(win)
  return chosen
}

/**
 * Start watching the configured screenshots folder for new image files.
 */
export function startFolderWatcher(win: BrowserWindow): void {
  const settings = getSettings()
  const folder = settings.screenshotsFolder

  if (!folder || !fs.existsSync(folder)) return
  if (watcher) {
    watcher.close()
    watcher = null
  }

  watcher = fs.watch(folder, async (eventType, filename) => {
    if (eventType !== 'rename' || !filename) return

    const ext = path.extname(filename).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext)) return

    const filePath = path.join(folder, filename)

    // Wait briefly for file to be fully written
    await sleep(300)

    if (!fs.existsSync(filePath)) return

    try {
      const thumbnailDataUrl = await generateThumbnail(filePath)
      insertScreenshot(filePath, thumbnailDataUrl)
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.ITEMS_UPDATED)
      }
    } catch {
      // File may still be locked — skip
    }
  })
}

export function stopFolderWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}

/**
 * Capture a full-screen screenshot using screenshot-desktop.
 * Saves to the configured screenshots folder.
 */
export async function captureScreenshot(win: BrowserWindow): Promise<string | null> {
  const settings = getSettings()
  let folder = settings.screenshotsFolder

  if (!folder) {
    const picked = await pickScreenshotsFolder(win)
    if (!picked) return null
    folder = picked
    startFolderWatcher(win)
  }

  try {
    // Dynamic import to avoid bundling issues
    const screenshotDesktop = await import('screenshot-desktop')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `Clipper-${timestamp}.png`
    const filePath = path.join(folder, filename)

    await screenshotDesktop.default({ filename: filePath })
    // The folder watcher will pick this up automatically
    return filePath
  } catch (err) {
    console.error('Screenshot failed:', err)
    return null
  }
}

/** Generate a 160×90 thumbnail as a data URL */
async function generateThumbnail(filePath: string): Promise<string> {
  try {
    // Use sharp for thumbnail generation
    const sharp = (await import('sharp')).default
    const buffer = await sharp(filePath)
      .resize(160, 90, { fit: 'cover' })
      .png({ quality: 70 })
      .toBuffer()
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    // Fallback: read full image and return a small base64 (less ideal)
    const data = fs.readFileSync(filePath)
    return `data:image/png;base64,${data.toString('base64').slice(0, 2000)}`
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
