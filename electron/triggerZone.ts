export interface DisplayBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

// Window height includes generous transparent padding below the island so shadows never clip
export const DOCK_HEIGHT = 192
export const VISIBLE_DOCK_HEIGHT = 192
export const DOCK_MAX_WIDTH = 900
export const TRIGGER_ZONE_PX = 16
export const TRIGGER_ZONE_WIDTH = 0.40

/**
 * Computes the centered floating dock window bounds for a given display.
 */
export function getDockWindowBounds(bounds: DisplayBounds): DisplayBounds {
  const width = Math.min(DOCK_MAX_WIDTH, Math.max(320, bounds.width - 32))
  const x = bounds.x + Math.round((bounds.width - width) / 2)
  return {
    x,
    y: bounds.y,
    width,
    height: DOCK_HEIGHT,
  }
}

/**
 * Determines whether the cursor is within the top-center trigger zone
 * or inside the visible floating dock island of the given display.
 */
export function evaluateCursorPosition(cursor: Point, bounds: DisplayBounds): {
  inTriggerZone: boolean
  inDockArea: boolean
} {
  const triggerWidthPx = bounds.width * TRIGGER_ZONE_WIDTH
  const triggerLeft = bounds.x + (bounds.width - triggerWidthPx) / 2
  const triggerRight = triggerLeft + triggerWidthPx

  const inTriggerZone =
    cursor.y >= bounds.y &&
    cursor.y <= bounds.y + TRIGGER_ZONE_PX &&
    cursor.x >= triggerLeft &&
    cursor.x <= triggerRight

  const dockBounds = getDockWindowBounds(bounds)
  const dockPad = 24
  const inDockArea =
    cursor.y >= bounds.y &&
    cursor.y <= bounds.y + VISIBLE_DOCK_HEIGHT &&
    cursor.x >= dockBounds.x - dockPad &&
    cursor.x <= dockBounds.x + dockBounds.width + dockPad

  return { inTriggerZone, inDockArea }
}
