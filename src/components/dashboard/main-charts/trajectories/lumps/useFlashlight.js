import { useCallback } from "react"
import { useMouseMoveSvg } from "../../../../hooks/useMouseMove"

export const FLASHLIGHT_RADIUS = 2

/**
 * Tracks the SVG-space cursor and exposes `isInFlashlight(cx, cy)`, which tells
 * whether a point falls inside the circular "flashlight" around the cursor and
 * how strongly (opacity fades linearly with distance from the cursor).
 */
export function useFlashlight(svgRef, radius = FLASHLIGHT_RADIUS) {
  const cursor = useMouseMoveSvg(svgRef)

  const isInFlashlight = useCallback(
    (cx, cy) => {
      const dx = cursor.x - cx
      const dy = cursor.y - cy
      const distance = Math.sqrt(dx * dx + dy * dy)

      return {
        visible: distance < radius,
        opacity: Math.max(0, 1 - distance / radius),
      }
    },
    [cursor.x, cursor.y, radius],
  )

  return { cursor, isInFlashlight, radius }
}
