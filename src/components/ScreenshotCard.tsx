import { useClipperStore } from '../store/useClipperStore'
import { CameraIcon, XIcon } from './Icons'
import type { ScreenshotItem } from '../types'

interface ScreenshotCardProps {
  item: ScreenshotItem
}

export default function ScreenshotCard({ item }: ScreenshotCardProps) {
  const { deleteItem, openFile } = useClipperStore()

  const handleClick = () => openFile(item.filePath)
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteItem(item.id, 'screenshot')
  }

  return (
    <div className="relative flex-shrink-0 group">
      <button
        onClick={handleClick}
        className="
          w-40 h-[98px] rounded-xl overflow-hidden
          border border-white/15 hover:border-emerald-400/50
          group-hover:-translate-y-0.5
          transition-all duration-150
          relative bg-[#1d212d]
        "
        title={item.filename}
      >
        {/* Thumbnail */}
        <img
          src={item.thumbnailDataUrl}
          alt={item.filename}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />

        {/* Bottom gradient scrim + filename */}
        <div className="
          absolute inset-x-0 bottom-0
          bg-gradient-to-t from-black/90 via-black/60 to-transparent
          px-2 pt-4 pb-1.5
          flex items-center gap-1.5
        ">
          <CameraIcon className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="text-[10.5px] font-medium text-zinc-100 truncate">
            {item.filename}
          </span>
        </div>
      </button>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="
          absolute top-1.5 right-1.5
          w-5 h-5 rounded-full
          bg-zinc-900/80 hover:bg-red-500 text-zinc-300 hover:text-white
          border border-white/15
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transition-all duration-150
        "
        title="Remove"
      >
        <XIcon className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}
