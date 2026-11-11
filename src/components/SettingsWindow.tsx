import { useState, useEffect } from 'react'
import { useClipperStore } from '../store/useClipperStore'
import { SettingsIcon, CheckIcon, FolderIcon } from './Icons'
import type { AppSettings } from '../types'

export default function SettingsWindow() {
  const { settings, loadSettings, saveSettings } = useClipperStore()
  const [local, setLocal] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (settings && !local) setLocal({ ...settings })
  }, [settings, local])

  if (!local) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400 text-sm">
        Loading settings…
      </div>
    )
  }

  const handleSave = async () => {
    await saveSettings(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePickFolder = async () => {
    const folder = await window.clipper.pickScreenshotsFolder()
    if (folder) setLocal(prev => prev ? { ...prev, screenshotsFolder: folder } : prev)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col justify-between">
      <div className="space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <SettingsIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Clipper Settings</h1>
            <p className="text-xs text-zinc-400">Configure shortcuts, storage, and privacy filters</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Hotkey */}
          <Field label="Screenshot Hotkey">
            <input
              type="text"
              value={local.hotkey}
              onChange={e => setLocal(prev => prev ? { ...prev, hotkey: e.target.value } : prev)}
              className="w-full bg-white/[0.06] border border-white/[0.1] focus:border-blue-400/60 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none transition"
              placeholder="Ctrl+Shift+S"
            />
          </Field>

          {/* Screenshots Folder */}
          <Field label="Screenshots Folder">
            <div className="flex gap-2">
              <input
                type="text"
                value={local.screenshotsFolder || 'Not configured yet'}
                readOnly
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-400 outline-none cursor-default"
              />
              <button
                onClick={handlePickFolder}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-xs font-medium text-zinc-200 transition whitespace-nowrap"
              >
                <FolderIcon className="w-3.5 h-3.5" />
                <span>Browse…</span>
              </button>
            </div>
          </Field>

          {/* Auto Launch */}
          <Field label="Startup">
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition">
              <input
                type="checkbox"
                checked={local.autoLaunch}
                onChange={e => setLocal(prev => prev ? { ...prev, autoLaunch: e.target.checked } : prev)}
                className="w-4 h-4 accent-blue-500 rounded"
              />
              <span className="text-sm text-zinc-200">Launch Clipper when Windows starts</span>
            </label>
          </Field>

          {/* Sensitive Apps */}
          <Field label="Blocked Apps" description="Clipboard items from these apps are excluded">
            <textarea
              value={local.sensitiveApps.join('\n')}
              onChange={e => setLocal(prev => prev ? {
                ...prev,
                sensitiveApps: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
              } : prev)}
              rows={4}
              className="w-full bg-white/[0.06] border border-white/[0.1] focus:border-blue-400/60 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none resize-none transition"
            />
          </Field>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between">
        <span className="text-xs text-zinc-500">History cap: 50 items</span>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-sm"
        >
          {saved && <CheckIcon className="w-3.5 h-3.5" />}
          <span>{saved ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  )
}

function Field({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
        {description && <span className="text-[11px] text-zinc-500">{description}</span>}
      </div>
      {children}
    </div>
  )
}
