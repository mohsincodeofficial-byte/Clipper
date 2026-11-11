import { describe, it, expect } from 'vitest'
import { evaluateCursorPosition, getDockWindowBounds, DOCK_HEIGHT, VISIBLE_DOCK_HEIGHT, DOCK_MAX_WIDTH, TRIGGER_ZONE_PX } from '../triggerZone'

describe('evaluateCursorPosition', () => {
  const primary = { x: 0, y: 0, width: 1920, height: 1080 }
  const secondary = { x: 1920, y: 0, width: 2560, height: 1440 }

  it('computes centered floating dock bounds', () => {
    const bounds = getDockWindowBounds(primary)
    expect(bounds.width).toBe(DOCK_MAX_WIDTH)
    expect(bounds.x).toBe((1920 - DOCK_MAX_WIDTH) / 2)
    expect(bounds.y).toBe(0)
    expect(bounds.height).toBe(DOCK_HEIGHT)
  })

  it('triggers when cursor is at top-center of primary display', () => {
    const res = evaluateCursorPosition({ x: 960, y: 2 }, primary)
    expect(res.inTriggerZone).toBe(true)
    expect(res.inDockArea).toBe(true)
  })

  it('does not trigger at top-left or top-right corners', () => {
    expect(evaluateCursorPosition({ x: 50, y: 2 }, primary).inTriggerZone).toBe(false)
    expect(evaluateCursorPosition({ x: 1850, y: 2 }, primary).inTriggerZone).toBe(false)
  })

  it('does not trigger below TRIGGER_ZONE_PX', () => {
    const res = evaluateCursorPosition({ x: 960, y: TRIGGER_ZONE_PX + 1 }, primary)
    expect(res.inTriggerZone).toBe(false)
    expect(res.inDockArea).toBe(true)
  })

  it('keeps inDockArea true inside centered floating dock and false horizontally outside', () => {
    expect(evaluateCursorPosition({ x: 700, y: VISIBLE_DOCK_HEIGHT }, primary).inDockArea).toBe(true)
    expect(evaluateCursorPosition({ x: 200, y: VISIBLE_DOCK_HEIGHT }, primary).inDockArea).toBe(false)
  })

  it('marks inDockArea false once cursor moves below visible dock', () => {
    const res = evaluateCursorPosition({ x: 960, y: VISIBLE_DOCK_HEIGHT + 20 }, primary)
    expect(res.inDockArea).toBe(false)
  })

  it('triggers on secondary monitor top-center', () => {
    const res = evaluateCursorPosition({ x: 3200, y: 3 }, secondary)
    expect(res.inTriggerZone).toBe(true)
    expect(res.inDockArea).toBe(true)
  })
})
