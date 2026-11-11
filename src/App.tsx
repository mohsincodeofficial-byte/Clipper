import { useEffect, useRef, useState } from 'react'
import Dock from './components/Dock'
import SettingsWindow from './components/SettingsWindow'
import { useClipperStore } from './store/useClipperStore'

const isSettingsPage = new URLSearchParams(window.location.search).get('settings') === '1'

export default function App() {
  const [dockVisible, setDockVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { loadItems, loadSettings, setHistoryFull } = useClipperStore()

  useEffect(() => {
    loadItems()
    loadSettings()

    const unsubShow = window.clipper.onDockShow(() => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      setAnimating(true)
      setDockVisible(true)
    })

    const unsubHide = window.clipper.onDockHide(() => {
      setDockVisible(false)
      setAnimating(true)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = setTimeout(() => {
        hideTimeoutRef.current = null
        setAnimating(false)
      }, 180)
    })

    const unsubUpdate = window.clipper.onItemsUpdated(() => {
      loadItems()
    })

    const unsubFull = window.clipper.onHistoryFull(() => {
      setHistoryFull(true)
      setAnimating(true)
      setDockVisible(true)
    })

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      unsubShow()
      unsubHide()
      unsubUpdate()
      unsubFull()
    }
  }, [loadItems, loadSettings, setHistoryFull])

  if (isSettingsPage) {
    return <SettingsWindow />
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <Dock visible={dockVisible} animating={animating} />
    </div>
  )
}
