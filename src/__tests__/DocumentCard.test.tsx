import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DocumentCard from '../components/DocumentCard'
import { useClipperStore } from '../store/useClipperStore'

vi.mock('../store/useClipperStore', () => ({
  useClipperStore: vi.fn(),
}))

describe('DocumentCard', () => {
  const openFile = vi.fn().mockResolvedValue(undefined)
  const deleteItem = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useClipperStore).mockReturnValue({
      openFile,
      deleteItem,
    } as never)
  })

  it('renders document filename and opens on click', () => {
    render(
      <DocumentCard
        item={{
          id: 20,
          type: 'document',
          filePath: 'C:\\Docs\\report.pdf',
          filename: 'report.pdf',
          ext: 'pdf',
          pinnedAt: Date.now(),
          createdAt: Date.now(),
        }}
      />
    )

    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('C:\\Docs\\report.pdf'))
    expect(openFile).toHaveBeenCalledWith('C:\\Docs\\report.pdf')
  })

  it('unpins document when Unpin button is clicked', () => {
    render(
      <DocumentCard
        item={{
          id: 20,
          type: 'document',
          filePath: 'C:\\Docs\\report.pdf',
          filename: 'report.pdf',
          ext: 'pdf',
          pinnedAt: Date.now(),
          createdAt: Date.now(),
        }}
      />
    )

    fireEvent.click(screen.getByTitle('Unpin'))
    expect(deleteItem).toHaveBeenCalledWith(20, 'document')
    expect(openFile).not.toHaveBeenCalled()
  })
})
