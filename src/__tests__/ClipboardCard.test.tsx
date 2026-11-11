import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ClipboardCard from '../components/ClipboardCard'
import { useClipperStore } from '../store/useClipperStore'

vi.mock('../store/useClipperStore', () => ({
  useClipperStore: vi.fn(),
}))

describe('ClipboardCard', () => {
  const copyItem = vi.fn().mockResolvedValue(true)
  const deleteItem = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useClipperStore).mockReturnValue({
      copyItem,
      deleteItem,
    } as never)
  })

  it('renders text item preview and copies on click', async () => {
    render(
      <ClipboardCard
        item={{
          id: 1,
          type: 'text',
          content: 'Sample copied text',
          preview: 'Sample copied text',
          createdAt: Date.now(),
        }}
      />
    )

    expect(screen.getByText('Sample copied text')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Sample copied text'))
    expect(copyItem).toHaveBeenCalledWith(1, 'text')
    expect(await screen.findByText('Copied!')).toBeInTheDocument()
  })

  it('deletes item when remove button is clicked without triggering copy', () => {
    render(
      <ClipboardCard
        item={{
          id: 2,
          type: 'image',
          dataUrl: 'data:image/png;base64,AAA',
          preview: 'Image',
          createdAt: Date.now(),
        }}
      />
    )

    fireEvent.click(screen.getByTitle('Remove'))
    expect(deleteItem).toHaveBeenCalledWith(2, 'image')
    expect(copyItem).not.toHaveBeenCalled()
  })
})
