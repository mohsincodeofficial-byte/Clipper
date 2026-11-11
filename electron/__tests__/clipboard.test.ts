import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockClipboard, mockNativeImage, mockStore } = vi.hoisted(() => ({
  mockClipboard: {
    availableFormats: vi.fn<[], string[]>(() => []),
    readText: vi.fn<[], string>(() => ''),
    readImage: vi.fn(),
    writeText: vi.fn(),
    writeImage: vi.fn(),
  },
  mockNativeImage: {
    createFromDataURL: vi.fn((url: string) => ({ url })),
  },
  mockStore: {
    insertClipboardText: vi.fn(),
    insertClipboardImage: vi.fn(),
    getSettings: vi.fn(() => ({
      hotkey: 'Ctrl+Shift+S',
      screenshotsFolder: '',
      sensitiveApps: ['Bitwarden'],
      autoLaunch: false,
      maxItems: 50,
    })),
    isHistoryFull: vi.fn(() => false),
    getDb: vi.fn(),
  },
}))

vi.mock('electron', () => ({
  clipboard: mockClipboard,
  BrowserWindow: vi.fn(),
  nativeImage: mockNativeImage,
  app: { getPath: () => '' },
}))

vi.mock('../store', () => mockStore)

import { simpleHash, startClipboardPoller, stopClipboardPoller, restoreToClipboard } from '../clipboard'
import { IPC } from '../../src/types'

function createMockWin() {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
    },
  } as unknown as Electron.BrowserWindow
}

describe('clipboard module', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockClipboard.availableFormats.mockReturnValue([])
    mockClipboard.readText.mockReturnValue('')
    mockStore.isHistoryFull.mockReturnValue(false)
  })

  afterEach(() => {
    stopClipboardPoller()
    vi.useRealTimers()
  })

  describe('simpleHash', () => {
    it('returns consistent hash for same input', () => {
      expect(simpleHash('hello')).toBe(simpleHash('hello'))
    })

    it('returns different hashes for different inputs', () => {
      expect(simpleHash('hello')).not.toBe(simpleHash('world'))
    })

    it('handles empty string', () => {
      expect(simpleHash('')).toBe('0')
    })

    it('handles unicode', () => {
      const h = simpleHash('🎉 emoji content')
      expect(typeof h).toBe('string')
      expect(h.length).toBeGreaterThan(0)
    })

    it('handles long strings without throwing', () => {
      const long = 'a'.repeat(100_000)
      expect(() => simpleHash(long)).not.toThrow()
    })
  })

  describe('poller', () => {
    it('captures new clipboard text and deduplicates repeats', () => {
      const win = createMockWin()
      mockClipboard.readText.mockReturnValue('copied text 1')

      startClipboardPoller(win)
      vi.advanceTimersByTime(500)
      expect(mockStore.insertClipboardText).toHaveBeenCalledWith('copied text 1')
      expect(win.webContents.send).toHaveBeenCalledWith(IPC.ITEMS_UPDATED)

      // Next tick with same text should be deduplicated
      vi.advanceTimersByTime(500)
      expect(mockStore.insertClipboardText).toHaveBeenCalledTimes(1)
    })

    it('skips sensitive content silently', () => {
      const win = createMockWin()
      mockClipboard.readText.mockReturnValue('AKIAIOSFODNN7EXAMPLE')

      startClipboardPoller(win)
      vi.advanceTimersByTime(500)
      expect(mockStore.insertClipboardText).not.toHaveBeenCalled()
    })

    it('emits HISTORY_FULL when 50-item cap is reached', () => {
      const win = createMockWin()
      const onFull = vi.fn()
      mockStore.isHistoryFull.mockReturnValue(true)
      mockClipboard.readText.mockReturnValue('new text when full')

      startClipboardPoller(win, onFull)
      vi.advanceTimersByTime(500)

      expect(mockStore.insertClipboardText).not.toHaveBeenCalled()
      expect(win.webContents.send).toHaveBeenCalledWith(IPC.HISTORY_FULL)
      expect(onFull).toHaveBeenCalled()
    })

    it('captures clipboard images when image format is available', () => {
      const win = createMockWin()
      mockClipboard.availableFormats.mockReturnValue(['image/png'])
      mockClipboard.readImage.mockReturnValue({
        isEmpty: () => false,
        toDataURL: () => 'data:image/png;base64,FAKEIMG',
      })

      startClipboardPoller(win)
      vi.advanceTimersByTime(500)

      expect(mockStore.insertClipboardImage).toHaveBeenCalledWith('data:image/png;base64,FAKEIMG')
      expect(win.webContents.send).toHaveBeenCalledWith(IPC.ITEMS_UPDATED)
    })
  })

  describe('restoreToClipboard', () => {
    it('restores text and image items from db', () => {
      mockStore.getDb.mockReturnValue({
        prepare: (sql: string) => ({
          get: () =>
            sql.includes('content')
              ? { content: 'restored text' }
              : { data_url: 'data:image/png;base64,RESTORED' },
        }),
      })

      expect(restoreToClipboard(1, 'text')).toBe(true)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('restored text')

      expect(restoreToClipboard(2, 'image')).toBe(true)
      expect(mockNativeImage.createFromDataURL).toHaveBeenCalledWith('data:image/png;base64,RESTORED')
      expect(mockClipboard.writeImage).toHaveBeenCalled()
    })

    it('returns false when item is missing', () => {
      mockStore.getDb.mockReturnValue({
        prepare: () => ({ get: () => undefined }),
      })
      expect(restoreToClipboard(999, 'text')).toBe(false)
    })
  })
})
