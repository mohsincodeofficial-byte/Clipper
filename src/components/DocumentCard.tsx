import { useClipperStore } from '../store/useClipperStore'
import { FileDocIcon, XIcon } from './Icons'
import type { DocumentItem } from '../types'

function getAccent(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'pdf':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/25'
    case 'doc':
    case 'docx':
    case 'md':
    case 'txt':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/25'
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
    case 'ppt':
    case 'pptx':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/25'
    case 'js':
    case 'ts':
    case 'py':
    case 'json':
    case 'html':
    case 'css':
      return 'bg-violet-500/15 text-violet-300 border-violet-500/25'
    default:
      return 'bg-zinc-500/15 text-zinc-300 border-white/10'
  }
}

interface DocumentCardProps {
  item: DocumentItem
}

export default function DocumentCard({ item }: DocumentCardProps) {
  const { deleteItem, openFile } = useClipperStore()

  const handleClick = () => openFile(item.filePath)
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteItem(item.id, 'document')
  }

  return (
    <div className="relative flex-shrink-0 group">
      <button
        onClick={handleClick}
        className="
          flex flex-col items-start justify-between
          w-32 h-[98px] p-2.5 rounded-xl
          bg-dock-card hover:bg-dock-card-hover
          border border-white/15 hover:border-white/30
          group-hover:-translate-y-0.5
          transition-all duration-150
          text-left overflow-hidden
        "
        title={item.filePath}
      >
        <div className="flex items-center gap-1.5">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${getAccent(item.ext)}`}>
            <FileDocIcon className="w-3.5 h-3.5" />
          </div>
          {item.ext && (
            <span className="text-[9.5px] font-semibold uppercase tracking-wider text-zinc-400">
              .{item.ext}
            </span>
          )}
        </div>

        <span className="text-[11px] font-medium text-zinc-200 line-clamp-2 w-full leading-tight">
          {item.filename}
        </span>
      </button>

      {/* Unpin button */}
      <button
        onClick={handleDelete}
        className="
          absolute top-1.5 right-1.5
          w-5 h-5 rounded-full
          bg-zinc-900/80 hover:bg-red-500 text-zinc-400 hover:text-white
          border border-white/10
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transition-all duration-150
        "
        title="Unpin"
      >
        <XIcon className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}
