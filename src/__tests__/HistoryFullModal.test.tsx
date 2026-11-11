import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HistoryFullModal from '../components/HistoryFullModal'
import { useClipperStore } from '../store/useClipperStore'

vi.mock('../store/useClipperStore', () => ({
  useClipperStore: vi.fn(),
}))

describe('HistoryFullModal', () => {
  const deleteOldest = vi.fn().mockResolvedValue(undefined)
  const deleteAll = vi.fn().mockResolvedValue(undefined)
  const setHistoryFull = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useClipperStore).mockReturnValue({
      deleteOldest,
      deleteAll,
      setHistoryFull,
    } as never)
  })

  it('renders 50-item prompt and clears oldest 25', async () => {
    render(<HistoryFullModal />)
    expect(screen.getByText(/Clipboard Full/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Remove oldest 25'))
    expect(deleteOldest).toHaveBeenCalledWith(25)
  })

  it('clears all when Clear all is clicked', () => {
    render(<HistoryFullModal />)
    fireEvent.click(screen.getByText('Clear all'))
    expect(deleteAll).toHaveBeenCalled()
  })

  it('dismisses modal', () => {
    render(<HistoryFullModal />)
    fireEvent.click(screen.getByText('Dismiss'))
    expect(setHistoryFull).toHaveBeenCalledWith(false)
  })
})
