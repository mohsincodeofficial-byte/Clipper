import { create } from 'zustand'
import type { ClipperItem, AppSettings } from '../types'

type FilterType = 'all' | 'text' | 'image' | 'screenshot' | 'document'

interface ClipperState {
  items: ClipperItem[]
  settings: AppSettings | null
  filterType: FilterType
  searchQuery: string
  isHistoryFull: boolean
  isLoading: boolean

  // Actions
  loadItems: () => Promise<void>
  loadSettings: () => Promise<void>
  setFilterType: (type: FilterType) => void
  setSearchQuery: (query: string) => void
  setHistoryFull: (full: boolean) => void
  copyItem: (id: number, type: string) => Promise<boolean>
  deleteItem: (id: number, type: string) => Promise<void>
  deleteAll: () => Promise<void>
  deleteOldest: (count: number) => Promise<void>
  openFile: (filePath: string) => Promise<void>
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>

  // Computed
  filteredItems: () => ClipperItem[]
}

const api = window.clipper

export const useClipperStore = create<ClipperState>((set, get) => ({
  items: [],
  settings: null,
  filterType: 'all',
  searchQuery: '',
  isHistoryFull: false,
  isLoading: false,

  loadItems: async () => {
    set({ isLoading: true })
    try {
      const items = await api.getItems()
      set({ items, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  loadSettings: async () => {
    const settings = await api.getSettings()
    set({ settings })
  },

  setFilterType: (filterType) => set({ filterType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setHistoryFull: (isHistoryFull) => set({ isHistoryFull }),

  copyItem: async (id, type) => {
    const success = await api.copyItem(id, type)
    return success
  },

  deleteItem: async (id, type) => {
    await api.deleteItem(id, type)
    set(state => ({ items: state.items.filter(i => i.id !== id) }))
  },

  deleteAll: async () => {
    await api.deleteAll()
    set(state => ({
      items: state.items.filter(i => i.type === 'screenshot' || i.type === 'document'),
      isHistoryFull: false
    }))
  },

  deleteOldest: async (count) => {
    await api.deleteOldest(count)
    await get().loadItems()
    set({ isHistoryFull: false })
  },

  openFile: async (filePath) => {
    await api.openFile(filePath)
  },

  saveSettings: async (settings) => {
    await api.saveSettings(settings)
    await get().loadSettings()
  },

  filteredItems: () => {
    const { items, filterType, searchQuery } = get()
    let filtered = items

    if (filterType !== 'all') {
      filtered = filtered.filter(item => {
        if (filterType === 'image') return item.type === 'image'
        return item.type === filterType
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(item => {
        if (item.type === 'text') return item.content.toLowerCase().includes(q)
        if (item.type === 'screenshot' || item.type === 'document') return item.filename.toLowerCase().includes(q)
        return false
      })
    }

    return filtered
  }
}))
