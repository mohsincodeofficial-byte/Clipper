import { useClipperStore } from '../store/useClipperStore'
import {
  ClipperMark,
  TextIcon,
  ImageIcon,
  CameraIcon,
  FolderIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from './Icons'

type FilterType = 'all' | 'text' | 'image' | 'screenshot' | 'document'

const FILTERS: { type: FilterType; label: string; icon?: React.ReactNode }[] = [
  { type: 'all', label: 'All' },
  { type: 'text', label: 'Text', icon: <TextIcon className="w-3 h-3" /> },
  { type: 'image', label: 'Images', icon: <ImageIcon className="w-3 h-3" /> },
  { type: 'screenshot', label: 'Shots', icon: <CameraIcon className="w-3 h-3" /> },
  { type: 'document', label: 'Docs', icon: <FolderIcon className="w-3 h-3" /> },
]

interface ToolbarProps {
  itemCount?: number
}

export default function Toolbar({ itemCount }: ToolbarProps) {
  const { filterType, searchQuery, setFilterType, setSearchQuery } = useClipperStore()

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2">
      {/* Brand badge */}
      <div className="flex items-center gap-1.5 pr-1.5 border-r border-white/[0.08]">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
          <ClipperMark className="w-3 h-3" />
        </div>
        <span className="text-xs font-semibold tracking-tight text-zinc-100">Clipper</span>
        {typeof itemCount === 'number' && (
          <span className="px-1.5 py-0.5 rounded-full bg-white/[0.08] text-[10px] font-medium text-zinc-400 tabular-nums">
            {itemCount}
          </span>
        )}
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#1a1d27] border border-white/15">
        {FILTERS.map(f => {
          const active = filterType === f.type
          return (
            <button
              key={f.type}
              onClick={() => setFilterType(f.type)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                transition-all duration-150
                ${active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }
              `}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          )
        })}
      </div>

      {/* Search input */}
      <div className="relative ml-auto flex items-center">
        <SearchIcon className="w-3 h-3 text-zinc-400 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search…"
          className="
            w-36 focus:w-48 h-7 pl-7 pr-6
            bg-[#1e222e] hover:bg-[#252a38] focus:bg-[#272d3d]
            rounded-lg text-[11px] text-white placeholder-zinc-400
            border border-white/20 focus:border-blue-400
            outline-none transition-all duration-150
            selectable
          "
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-1.5 p-0.5 rounded text-zinc-400 hover:text-white"
            title="Clear search"
          >
            <XIcon className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/15">
        <button
          onClick={() => window.clipper.captureScreenshot()}
          className="
            flex items-center gap-1 h-7 px-2.5 rounded-lg
            bg-[#1e222e] hover:bg-[#2a3040]
            border border-white/20
            text-[11px] font-medium text-white
            transition-all duration-150
          "
          title="Capture screenshot (Ctrl+Shift+S)"
        >
          <CameraIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Snap</span>
        </button>

        <button
          onClick={() => window.clipper.openSettings?.()}
          className="
            flex items-center justify-center w-7 h-7 rounded-lg
            bg-[#1e222e] hover:bg-[#2a3040]
            border border-white/20
            text-zinc-200 hover:text-white
            transition-all duration-150
          "
          title="Settings"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
