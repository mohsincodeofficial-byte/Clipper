import type { ClipperItem, AppSettings } from './types'

declare global {
  interface Window {
    clipper: {
      getItems(): Promise<ClipperItem[]>
      copyItem(id: number, type: string): Promise<boolean>
      deleteItem(id: number, type: string): Promise<void>
      deleteAll(): Promise<void>
      deleteOldest(count: number): Promise<void>
      pinFile(filePath: string): Promise<boolean>
      openFile(filePath: string): Promise<void>
      captureScreenshot(): Promise<string | null>
      pickScreenshotsFolder(): Promise<string | null>
      getSettings(): Promise<AppSettings>
      saveSettings(settings: Partial<AppSettings>): Promise<void>
      openSettings(): Promise<void>
      hideDock(): Promise<void>
      onItemsUpdated(cb: () => void): () => void
      onHistoryFull(cb: () => void): () => void
      onDockShow(cb: () => void): () => void
      onDockHide(cb: () => void): () => void
    }
  }
}

export {}
