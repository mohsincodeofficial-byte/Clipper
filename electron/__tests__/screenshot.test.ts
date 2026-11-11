import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const { mockDialog, mockStore, mockScreenshotDesktop } = vi.hoisted(() => ({
  mockDialog: {
    showOpenDialog: vi.fn(),
  },
  mockStore: {
    insertScreenshot: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
  },
  mockScreenshotDesktop: vi.fn(),
}))

vi.mock('electron', () => ({
  dialog: mockDialog,
  BrowserWindow: vi.fn(),
  app: { getPath: () => os.tmpdir() },
}))

vi.mock('../store', () => mockStore)

vi.mock('screenshot-desktop', () => ({
  default: mockScreenshotDesktop,
}))

vi.mock('sharp', () => ({
  default: () => ({
    resize: () => ({
      png: () => ({
        toBuffer: async () => Buffer.from('thumb-bytes'),
      }),
    }),
  }),
}))

import {
  pickScreenshotsFolder,
  startFolderWatcher,
  stopFolderWatcher,
  captureScreenshot,
} from '../screenshot'
import { IPC } from '../../src/types'

function createMockWin() {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
    },
  } as unknown as Electron.BrowserWindow
}

describe('screenshot module', () => {
  let tmpDir: string

  beforeEach(() => {
    vi.clearAllMocks()
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipper-shot-'))
    mockStore.getSettings.mockReturnValue({
      hotkey: 'Ctrl+Shift+S',
      screenshotsFolder: tmpDir,
      sensitiveApps: [],
      autoLaunch: false,
      maxItems: 50,
    })
  })

  afterEach(() => {
    stopFolderWatcher()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('picks screenshots folder and saves setting', async () => {
    const win = createMockWin()
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [tmpDir],
    })

    const picked = await pickScreenshotsFolder(win)
    expect(picked).toBe(tmpDir)
    expect(mockStore.saveSettings).toHaveBeenCalledWith({ screenshotsFolder: tmpDir })
  })

  it('returns null when folder picker is canceled', async () => {
    const win = createMockWin()
    mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })

    const picked = await pickScreenshotsFolder(win)
    expect(picked).toBeNull()
    expect(mockStore.saveSettings).not.toHaveBeenCalled()
  })

  it('captures screenshot into configured folder', async () => {
    const win = createMockWin()
    mockScreenshotDesktop.mockResolvedValue(undefined)

    const result = await captureScreenshot(win)
    expect(result).toContain(tmpDir)
    expect(result).toMatch(/Clipper-.*\.png$/)
    expect(mockScreenshotDesktop).toHaveBeenCalledTimes(1)
  })

  it('prompts for folder on capture when not configured and aborts if canceled', async () => {
    const win = createMockWin()
    mockStore.getSettings.mockReturnValue({
      hotkey: 'Ctrl+Shift+S',
      screenshotsFolder: '',
      sensitiveApps: [],
      autoLaunch: false,
      maxItems: 50,
    })
    mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })

    const result = await captureScreenshot(win)
    expect(result).toBeNull()
    expect(mockScreenshotDesktop).not.toHaveBeenCalled()
  })

  it('watches folder and processes new image files', async () => {
    const win = createMockWin()
    const holder: { cb: ((eventType: string, filename: string | null) => Promise<void> | void) | null } = { cb: null }
    const closeSpy = vi.fn()

    const watchSpy = vi.spyOn(fs, 'watch').mockImplementation(((_path: unknown, cb: unknown) => {
      holder.cb = cb as typeof holder.cb
      return { close: closeSpy } as unknown as fs.FSWatcher
    }) as typeof fs.watch)

    startFolderWatcher(win)
    expect(watchSpy).toHaveBeenCalledWith(tmpDir, expect.any(Function))

    const shotPath = path.join(tmpDir, 'test-shot.png')
    fs.writeFileSync(shotPath, 'fake-png-data')

    // Ignore non-image files
    await holder.cb?.('rename', 'notes.txt')
    expect(mockStore.insertScreenshot).not.toHaveBeenCalled()

    // Process valid PNG file
    await holder.cb?.('rename', 'test-shot.png')
    expect(mockStore.insertScreenshot).toHaveBeenCalledWith(
      shotPath,
      expect.stringMatching(/^data:image\/png;base64,/)
    )
    expect(win.webContents.send).toHaveBeenCalledWith(IPC.ITEMS_UPDATED)

    stopFolderWatcher()
    expect(closeSpy).toHaveBeenCalled()
    watchSpy.mockRestore()
  })
})
