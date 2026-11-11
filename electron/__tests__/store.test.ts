import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

let tmpDir: string

vi.mock('electron', () => ({
  app: {
    getPath: () => tmpDir,
  },
}))

import {
  getDb,
  closeDb,
  insertClipboardText,
  insertClipboardImage,
  insertScreenshot,
  insertDocument,
  deleteDocument,
  getAllItems,
  getClipboardCount,
  deleteItemById,
  deleteAllClipboard,
  deleteOldestClipboard,
  getSettings,
  saveSettings,
  isHistoryFull,
  MAX_ITEMS,
} from '../store'

describe('store (SQLite)', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipper-test-'))
    getDb()
  })

  afterEach(() => {
    closeDb()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('initializes schema and default settings', () => {
    const settings = getSettings()
    expect(settings.hotkey).toBe('Ctrl+Shift+S')
    expect(settings.maxItems).toBe(50)
    expect(settings.autoLaunch).toBe(false)
    expect(settings.sensitiveApps).toContain('Bitwarden')
  })

  it('inserts and retrieves clipboard text and image items', () => {
    insertClipboardText('hello world')
    insertClipboardImage('data:image/png;base64,AAA')

    const items = getAllItems()
    expect(items).toHaveLength(2)
    expect(getClipboardCount()).toBe(2)

    const textItem = items.find(i => i.type === 'text')
    expect(textItem).toBeDefined()
    if (textItem?.type === 'text') {
      expect(textItem.content).toBe('hello world')
      expect(textItem.preview).toBe('hello world')
    }
  })

  it('truncates text preview at 200 chars', () => {
    const longText = 'x'.repeat(350)
    insertClipboardText(longText)
    const [item] = getAllItems()
    expect(item.type).toBe('text')
    if (item.type === 'text') {
      expect(item.preview).toHaveLength(200)
      expect(item.content).toHaveLength(350)
    }
  })

  it('enforces 50-item cap detection and oldest deletion', () => {
    for (let i = 0; i < MAX_ITEMS; i++) {
      insertClipboardText(`item-${i}`)
    }
    expect(isHistoryFull()).toBe(true)
    expect(getClipboardCount()).toBe(50)

    deleteOldestClipboard(25)
    expect(getClipboardCount()).toBe(25)
    expect(isHistoryFull()).toBe(false)

    deleteAllClipboard()
    expect(getClipboardCount()).toBe(0)
  })

  it('inserts and deletes screenshots and documents', () => {
    const docFile = path.join(tmpDir, 'notes.pdf')
    fs.writeFileSync(docFile, 'pdf-bytes')

    insertScreenshot(path.join(tmpDir, 'shot.png'), 'data:image/png;base64,SHOT')
    const pinned = insertDocument(docFile)
    expect(pinned).not.toBeNull()
    expect(pinned?.ext).toBe('pdf')

    // Non-existent document returns null
    expect(insertDocument(path.join(tmpDir, 'missing.txt'))).toBeNull()

    let items = getAllItems()
    expect(items.filter(i => i.type === 'screenshot')).toHaveLength(1)
    expect(items.filter(i => i.type === 'document')).toHaveLength(1)

    if (pinned) deleteDocument(pinned.id)
    const shot = items.find(i => i.type === 'screenshot')
    if (shot) deleteItemById(shot.id, 'screenshot')

    items = getAllItems()
    expect(items).toHaveLength(0)
  })

  it('updates and persists settings', () => {
    saveSettings({
      hotkey: 'Ctrl+Alt+C',
      screenshotsFolder: 'C:\\Shots',
      autoLaunch: true,
      sensitiveApps: ['CustomVault'],
    })
    const updated = getSettings()
    expect(updated.hotkey).toBe('Ctrl+Alt+C')
    expect(updated.screenshotsFolder).toBe('C:\\Shots')
    expect(updated.autoLaunch).toBe(true)
    expect(updated.sensitiveApps).toEqual(['CustomVault'])
  })
})
