import { useClipperStore } from '../store/useClipperStore'
import { ClipperMark } from './Icons'

export default function HistoryFullModal() {
  const { deleteOldest, deleteAll, setHistoryFull } = useClipperStore()

  const handleClearOldest = async () => {
    await deleteOldest(25)
    setHistoryFull(false)
  }

  const handleClearAll = async () => {
    await deleteAll()
    setHistoryFull(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Clipboard Full"
      className="
        absolute inset-0 z-50 flex items-center justify-between gap-4 px-5
        bg-zinc-950/95 backdrop-blur-xl rounded-2xl
        animate-fade-in
      "
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
          <ClipperMark className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-zinc-100 font-semibold text-sm">
            Clipboard Full (50/50 items)
          </h2>
          <p className="text-zinc-400 text-xs">
            Free up space to continue saving new clipboard items.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleClearOldest}
          className="
            px-3 py-1.5 rounded-lg
            bg-blue-600 hover:bg-blue-500
            text-white text-xs font-medium
            transition-colors duration-150
          "
        >
          Remove oldest 25
        </button>
        <button
          onClick={handleClearAll}
          className="
            px-3 py-1.5 rounded-lg
            bg-white/10 hover:bg-white/20
            text-zinc-200 text-xs font-medium
            transition-colors duration-150
          "
        >
          Clear all
        </button>
        <button
          onClick={() => setHistoryFull(false)}
          className="
            px-2.5 py-1.5 rounded-lg
            text-zinc-400 hover:text-zinc-200
            text-xs transition-colors duration-150
          "
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
