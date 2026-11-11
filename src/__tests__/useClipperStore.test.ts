import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClipperItem } from '../types'

const mockItems: ClipperItem[] = [
  { id: 1, type: 'text', content: 'Hello Clipper', preview: 'Hello Clipper', createdAt: 1000 },
  { id: 2, type: 'image', dataUrl: 'data:image/png;base64,IMG', preview: 'Image', createdAt: 2000 },
  { id: 3, type: 'screenshot', filePath: 'C:\\shot.png', filename: 'shot.png', thumbnailDataUrl: 'data:image/png;base64,S', createdAt: 3000 },
  { id: 4, type: 'document', filePath: 'C:\\spec.pdf', filename: 'spec.pdf', ext: 'pdf', pinnedAt: 4000, createdAt: 4000 },
]

describe('useClipperStore', () => {
  beforeEach(() => {
    vi.resetModules()
    window.clipper = {
      getItems: vi.fn().mockResolvedValue(mockItems),
      getSettings: vi.fn().mockResolvedValue({
        hotkey: 'Ctrl+Shift+S',
        screenshotsFolder: '',
        sensitiveApps: ['Bitwarden'],
        autoLaunch: false,
        maxItems: 50,
      }),
      copyItem: vi.fn().mockResolvedValue(true),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      deleteAll: vi.fn().mockResolvedValue(undefined),
      deleteOldest: vi.fn().mockResolvedValue(undefined),
      openFile: vi.fn().mockResolvedValue(undefined),
      saveSettings: vi.fn().mockResolvedValue(undefined),
    } as never
  })

  it('loads items and filters by type and search query', async () => {
    const { useClipperStore } = await import('../store/useClipperStore')
    await useClipperStore.getState().loadItems()
    expect(useClipperStore.getState().filteredItems()).toHaveLength(4)

    useClipperStore.getState().setFilterType('document')
    expect(useClipperStore.getState().filteredItems()).toHaveLength(1)
    expect(useClipperStore.getState().filteredItems()[0].type).toBe('document')

    useClipperStore.getState().setFilterType('all')
    useClipperStore.getState().setSearchQuery('hello')
    expect(useClipperStore.getState().filteredItems()).toHaveLength(1)
    expect(useClipperStore.getState().filteredItems()[0].id).toBe(1)
  })

  it('keeps screenshots and documents when deleteAll clears clipboard items', async () => {
    const { useClipperStore } = await import('../store/useClipperStore')
    await useClipperStore.getState().loadItems()
    await useClipperStore.getState().deleteAll()

    const remaining = useClipperStore.getState().items
    expect(remaining).toHaveLength(2)
    expect(remaining.every(i => i.type === 'screenshot' || i.type === 'document')).toBe(true)
  })
})
