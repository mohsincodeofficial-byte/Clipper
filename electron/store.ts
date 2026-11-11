import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { ClipperItem, AppSettings, ClipboardTextItem, ClipboardImageItem, ScreenshotItem, DocumentItem } from '../src/types'

const DB_VERSION = 1
const MAX_ITEMS = 50

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData')
    fs.mkdirSync(userDataPath, { recursive: true })
    const dbPath = path.join(userDataPath, 'clipper.db')
    const packagedBinding = app?.isPackaged
      ? path.join(process.resourcesPath, 'better_sqlite3.node')
      : undefined
    const nativeBinding = process.env.BETTER_SQLITE3_BINDING || packagedBinding
    db = new Database(dbPath, nativeBinding ? { nativeBinding } : undefined)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clipboard_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT    NOT NULL CHECK(type IN ('text', 'image')),
      content    TEXT,
      data_url   TEXT,
      preview    TEXT    NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS screenshot_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path       TEXT    NOT NULL UNIQUE,
      filename        TEXT    NOT NULL,
      thumbnail_data_url TEXT NOT NULL,
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path  TEXT    NOT NULL UNIQUE,
      filename   TEXT    NOT NULL,
      ext        TEXT    NOT NULL,
      pinned_at  INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id          INTEGER PRIMARY KEY CHECK(id = 1),
      hotkey      TEXT    NOT NULL DEFAULT 'Ctrl+Shift+S',
      screenshots_folder TEXT NOT NULL DEFAULT '',
      sensitive_apps     TEXT NOT NULL DEFAULT '["Bitwarden","1Password","KeePass","LastPass","Dashlane","Keeper","RoboForm"]',
      auto_launch INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);
    INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '${DB_VERSION}');
  `)
}

// ─── Clipboard ─────────────────────────────────────────────────────────────

export function insertClipboardText(content: string): void {
  const db = getDb()
  const preview = content.trim().replace(/\s+/g, ' ').slice(0, 200)
  const now = Date.now()
  db.prepare(`
    INSERT INTO clipboard_items (type, content, preview, created_at)
    VALUES ('text', ?, ?, ?)
  `).run(content, preview, now)
  enforceLimit(db)
}

export function insertClipboardImage(dataUrl: string): void {
  const db = getDb()
  const now = Date.now()
  db.prepare(`
    INSERT INTO clipboard_items (type, data_url, preview, created_at)
    VALUES ('image', ?, 'Image', ?)
  `).run(dataUrl, now)
  enforceLimit(db)
}

// ─── Screenshots ─────────────────────────────────────────────────────────

export function insertScreenshot(filePath: string, thumbnailDataUrl: string): void {
  const db = getDb()
  const filename = path.basename(filePath)
  const now = Date.now()
  db.prepare(`
    INSERT OR IGNORE INTO screenshot_items (file_path, filename, thumbnail_data_url, created_at)
    VALUES (?, ?, ?, ?)
  `).run(filePath, filename, thumbnailDataUrl, now)
}

// ─── Documents ─────────────────────────────────────────────────────────────

export function insertDocument(filePath: string): DocumentItem | null {
  const db = getDb()
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null
  const filename = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const now = Date.now()
  const result = db.prepare(`
    INSERT OR IGNORE INTO document_items (file_path, filename, ext, pinned_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(filePath, filename, ext, now, now)
  if (result.changes === 0) return null
  return { id: Number(result.lastInsertRowid), type: 'document', filePath, filename, ext, pinnedAt: now, createdAt: now }
}

export function deleteDocument(id: number): void {
  getDb().prepare('DELETE FROM document_items WHERE id = ?').run(id)
}

// ─── Queries ───────────────────────────────────────────────────────────────

export function getAllItems(): ClipperItem[] {
  const db = getDb()

  const clipboardRows = db.prepare('SELECT * FROM clipboard_items ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  const screenshotRows = db.prepare('SELECT * FROM screenshot_items ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  const documentRows = db.prepare('SELECT * FROM document_items ORDER BY pinned_at DESC').all() as Array<Record<string, unknown>>

  const clipboardItems: ClipperItem[] = clipboardRows.map(row => {
    if (row.type === 'text') {
      const content = row.content as string
      const normalizedPreview = content.trim().replace(/\s+/g, ' ').slice(0, 200) || (row.preview as string)
      return { id: row.id as number, type: 'text', content, preview: normalizedPreview, createdAt: row.created_at as number } as ClipboardTextItem
    } else {
      return { id: row.id as number, type: 'image', dataUrl: row.data_url as string, preview: 'Image', createdAt: row.created_at as number } as ClipboardImageItem
    }
  })

  const screenshotItems: ClipperItem[] = screenshotRows.map(row => ({
    id: row.id as number,
    type: 'screenshot',
    filePath: row.file_path as string,
    filename: row.filename as string,
    thumbnailDataUrl: row.thumbnail_data_url as string,
    createdAt: row.created_at as number,
  } as ScreenshotItem))

  const documentItems: ClipperItem[] = documentRows.map(row => ({
    id: row.id as number,
    type: 'document',
    filePath: row.file_path as string,
    filename: row.filename as string,
    ext: row.ext as string,
    pinnedAt: row.pinned_at as number,
    createdAt: row.created_at as number,
  } as DocumentItem))

  return [...clipboardItems, ...screenshotItems, ...documentItems]
}

export function getClipboardCount(): number {
  return (getDb().prepare('SELECT COUNT(*) as count FROM clipboard_items').get() as { count: number }).count
}

export function deleteItemById(id: number, type: string): void {
  const db = getDb()
  if (type === 'text' || type === 'image') {
    db.prepare('DELETE FROM clipboard_items WHERE id = ?').run(id)
  } else if (type === 'screenshot') {
    db.prepare('DELETE FROM screenshot_items WHERE id = ?').run(id)
  } else if (type === 'document') {
    db.prepare('DELETE FROM document_items WHERE id = ?').run(id)
  }
}

export function deleteAllClipboard(): void {
  getDb().prepare('DELETE FROM clipboard_items').run()
}

export function deleteOldestClipboard(count: number): void {
  getDb().prepare(`
    DELETE FROM clipboard_items
    WHERE id IN (
      SELECT id FROM clipboard_items ORDER BY created_at ASC LIMIT ?
    )
  `).run(count)
}

// ─── Settings ──────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  const row = getDb().prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, unknown>
  return {
    hotkey: row.hotkey as string,
    screenshotsFolder: row.screenshots_folder as string,
    sensitiveApps: JSON.parse(row.sensitive_apps as string) as string[],
    autoLaunch: Boolean(row.auto_launch),
    maxItems: MAX_ITEMS,
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const db = getDb()
  if (settings.hotkey !== undefined) db.prepare('UPDATE settings SET hotkey = ? WHERE id = 1').run(settings.hotkey)
  if (settings.screenshotsFolder !== undefined) db.prepare('UPDATE settings SET screenshots_folder = ? WHERE id = 1').run(settings.screenshotsFolder)
  if (settings.sensitiveApps !== undefined) db.prepare('UPDATE settings SET sensitive_apps = ? WHERE id = 1').run(JSON.stringify(settings.sensitiveApps))
  if (settings.autoLaunch !== undefined) db.prepare('UPDATE settings SET auto_launch = ? WHERE id = 1').run(settings.autoLaunch ? 1 : 0)
}

// ─── Internal ──────────────────────────────────────────────────────────────

function enforceLimit(db: Database.Database): 'ok' | 'full' {
  const count = (db.prepare('SELECT COUNT(*) as count FROM clipboard_items').get() as { count: number }).count
  if (count > MAX_ITEMS) return 'full'
  return 'ok'
}

export function isHistoryFull(): boolean {
  return getClipboardCount() >= MAX_ITEMS
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = undefined as unknown as Database.Database
  }
}

export { MAX_ITEMS }
