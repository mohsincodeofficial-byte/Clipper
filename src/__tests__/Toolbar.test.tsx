import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Toolbar from '../components/Toolbar'
import { useClipperStore } from '../store/useClipperStore'

vi.mock('../store/useClipperStore', () => ({
  useClipperStore: vi.fn(),
}))

describe('Toolbar', () => {
  const setFilterType = vi.fn()
  const setSearchQuery = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useClipperStore).mockReturnValue({
      filterType: 'all',
      searchQuery: '',
      setFilterType,
      setSearchQuery,
    } as never)

    window.clipper = {
      captureScreenshot: vi.fn().mockResolvedValue(null),
    } as never
  })

  it('updates filter type and search query', () => {
    render(<Toolbar />)

    fireEvent.click(screen.getByText('All'))
    expect(setFilterType).toHaveBeenCalledWith('all')

    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'notes' } })
    expect(setSearchQuery).toHaveBeenCalledWith('notes')
  })

  it('triggers screenshot capture on camera button click', () => {
    render(<Toolbar />)
    fireEvent.click(screen.getByTitle('Capture screenshot (Ctrl+Shift+S)'))
    expect(window.clipper.captureScreenshot).toHaveBeenCalled()
  })
})
