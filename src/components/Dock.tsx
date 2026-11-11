import { useRef, useState } from 'react'
import { useClipperStore } from '../store/useClipperStore'
import ClipboardCard from './ClipboardCard'
import ScreenshotCard from './ScreenshotCard'
import DocumentCard from './DocumentCard'
import Toolbar from './Toolbar'
import HistoryFullModal from './HistoryFullModal'
import { DropIcon } from './Icons'
import type { ClipperItem } from '../types'

interface DockProps {
  visible: boolean
  animating: boolean
}

export default function Dock({ visible, animating }: DockProps) {
  const { filteredItems, isHistoryFull } = useClipperStore()
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const items = filteredItems()
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const files = Array.from(e.dataTransfer.files) as Array<File & { path?: string }>
    files.forEach(file => {
      if (file.path) {
        window.clipper.pinFile(file.path)
      }
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!isDraggingOver) setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  if (!visible && !animating) return null

  return (
    <div
      className={`
        w-full px-4 pt-2 pb-2
        ${visible ? 'animate-slide-down' : 'animate-slide-up'}
      `}
    >
      {/* Floating Dock Island */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative w-full rounded-2xl overflow-hidden
          bg-dock-bg
          border ring-1 ring-black/80 transition-colors duration-150
          ${isDraggingOver
            ? 'border-blue-400 ring-2 ring-blue-500/40 bg-[#171b26]'
            : 'border-white/20'
          }
        `}
      >
        {/* History Full Modal (scoped inside floating island) */}
        {isHistoryFull && <HistoryFullModal />}

        {/* Toolbar */}
        <Toolbar itemCount={items.length} />

        {/* Subtle divider */}
        <div className="mx-3.5 h-px bg-white/10" />

        {/* Cards strip */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="dock-scroll flex flex-row items-center gap-2.5 px-3.5 py-3 overflow-x-auto overflow-y-hidden"
          style={{ height: '126px' }}
        >
          {items.length === 0 ? (
            <EmptyState isDragging={isDraggingOver} />
          ) : (
            <>
              {items.map(item => (
                <ItemCard key={`${item.type}-${item.id}`} item={item} />
              ))}
              <DropHint active={isDraggingOver} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemCard({ item }: { item: ClipperItem }) {
  if (item.type === 'text' || item.type === 'image') {
    return <ClipboardCard item={item} />
  }
  if (item.type === 'screenshot') {
    return <ScreenshotCard item={item} />
  }
  if (item.type === 'document') {
    return <DocumentCard item={item} />
  }
  return null
}

function EmptyState({ isDragging }: { isDragging: boolean }) {
  return (
    <div className="
      flex items-center justify-center gap-2.5 w-full h-[98px]
      rounded-xl border border-dashed border-white/20 bg-[#181b25]
    ">
      <DropIcon className={`w-4 h-4 ${isDragging ? 'text-blue-400' : 'text-zinc-300'}`} />
      <p className="text-xs text-zinc-300">
        {isDragging
          ? 'Release to pin file to Clipper'
          : 'Copy text or images, take a screenshot (Ctrl+Shift+S), or drop files here'}
      </p>
    </div>
  )
}

function DropHint({ active }: { active: boolean }) {
  return (
    <div
      className={`
        flex-shrink-0 flex flex-col items-center justify-center gap-1
        w-20 h-[98px] rounded-xl border border-dashed transition-colors duration-150
        ${active
          ? 'border-blue-400 bg-blue-500/15 text-blue-200'
          : 'border-white/25 bg-[#181b25] text-zinc-300 hover:text-white hover:border-white/40'
        }
      `}
    >
      <DropIcon className="w-4 h-4" />
      <span className="text-[10px] font-medium">Drop file</span>
    </div>
  )
}
