import { useState } from 'react'
import { useClipperStore } from '../store/useClipperStore'
import { TextIcon, ImageIcon, XIcon, CheckIcon } from './Icons'
import type { ClipboardTextItem, ClipboardImageItem } from '../types'

type ClipboardCardItem = ClipboardTextItem | ClipboardImageItem

interface ClipboardCardProps {
  item: ClipboardCardItem
}

export default function ClipboardCard({ item }: ClipboardCardProps) {
  const [toastVisible, setToastVisible] = useState(false)
  const { copyItem, deleteItem } = useClipperStore()

  const handleClick = async () => {
    const success = await copyItem(item.id, item.type)
    if (success) {
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 1500)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteItem(item.id, item.type)
  }

  const isText = item.type === 'text'
  const displayText = isText ? (item.preview || item.content).trim() : ''

  return (
    <div className="relative flex-shrink-0 group">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="
          flex flex-col justify-start gap-1.5
          w-44 h-[98px] p-2.5 rounded-xl cursor-pointer
          bg-dock-card hover:bg-dock-card-hover
          border border-dock-border hover:border-white/30
          group-hover:-translate-y-0.5
          transition-all duration-150
          text-left overflow-hidden outline-none
          focus-visible:ring-2 focus-visible:ring-blue-400/60
        "
        title={isText ? item.content : 'Clipboard image'}
      >
        {/* Header row */}
        <div className="flex items-center gap-1.5 w-full pr-4 flex-shrink-0">
          <span
            className={`
              inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
              text-[10px] font-medium
              ${isText
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-violet-500/20 text-violet-300'
              }
            `}
          >
            {isText ? <TextIcon className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
            <span>{isText ? 'Text' : 'Image'}</span>
          </span>
          <span className="ml-auto text-[10px] text-zinc-400 tabular-nums">
            {formatTime(item.createdAt)}
          </span>
        </div>

        {/* Content preview */}
        {isText ? (
          <div className="w-full overflow-hidden">
            <p className="w-full text-[12px] text-white/95 leading-[1.3] line-clamp-3 break-words selectable m-0">
              {displayText}
            </p>
          </div>
        ) : (
          <div className="w-full h-[52px] rounded-lg overflow-hidden bg-black/30 border border-white/10">
            <img
              src={item.dataUrl}
              alt="Clipboard image"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={handleDelete}
        className="
          absolute top-1.5 right-1.5
          w-5 h-5 rounded-full
          bg-zinc-900/90 hover:bg-red-500 text-zinc-300 hover:text-white
          border border-white/15
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transition-all duration-150
        "
        title="Remove"
      >
        <XIcon className="w-2.5 h-2.5" />
      </button>

      {/* Copied toast */}
      {toastVisible && (
        <div className="
          absolute inset-0 flex items-center justify-center gap-1.5
          rounded-xl bg-emerald-600/95 backdrop-blur-sm
          text-white text-xs font-semibold pointer-events-none
          animate-fade-in
        ">
          <CheckIcon className="w-4 h-4" />
          <span>Copied!</span>
        </div>
      )}
    </div>
  )
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}
