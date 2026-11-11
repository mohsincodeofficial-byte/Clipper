import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ScreenshotCard from '../components/ScreenshotCard'
import { useClipperStore } from '../store/useClipperStore'

vi.mock('../store/useClipperStore', () => ({
  useClipperStore: vi.fn(),
}))

describe('ScreenshotCard', () => {
  const openFile = vi.fn().mockResolvedValue(undefined)
  const deleteItem = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useClipperStore).mockReturnValue({
      openFile,
      deleteItem,
    } as never)
  })

  it('renders screenshot thumbnail and opens file on click', () => {
    render(
      <ScreenshotCard
        item={{
          id: 10,
          type: 'screenshot',
          filePath: 'C:\\Shots\\shot.png',
          filename: 'shot.png',
          thumbnailDataUrl: 'data:image/png;base64,SHOT',
          createdAt: Date.now(),
        }}
      />
    )

    expect(screen.getByAltText('shot.png')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('shot.png'))
    expect(openFile).toHaveBeenCalledWith('C:\\Shots\\shot.png')
  })

  it('removes screenshot when delete button is clicked', () => {
    render(
      <ScreenshotCard
        item={{
          id: 10,
          type: 'screenshot',
          filePath: 'C:\\Shots\\shot.png',
          filename: 'shot.png',
          thumbnailDataUrl: 'data:image/png;base64,SHOT',
          createdAt: Date.now(),
        }}
      />
    )

    fireEvent.click(screen.getByTitle('Remove'))
    expect(deleteItem).toHaveBeenCalledWith(10, 'screenshot')
    expect(openFile).not.toHaveBeenCalled()
  })
})
