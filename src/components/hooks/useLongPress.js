import { useCallback, useRef, useState } from "react"

// interface UseLongPressWithProgressOptions {
//   onLongPress: (event?: React.MouseEvent | React.TouchEvent) => void
//   onClick?: (event?: React.MouseEvent | React.TouchEvent) => void
//   threshold?: number
//   onProgress?: (progress: number) => void
// }

export function useLongPressWithProgress({ onLongPress, onClick, threshold = 500, onProgress }) {
  const [isPressed, setIsPressed] = useState(false)
  const [progress, setProgress] = useState(0)
  const timeout = useRef()
  const interval = useRef()
  // Ref to track if the long press action was triggered
  const longPressTriggered = useRef(false)

  const start = useCallback(
    (event) => {
      // Prevent the browser's default context menu on long press
      if (event.type === "mousedown") {
        event.preventDefault()
      }

      setIsPressed(true)
      setProgress(0)
      longPressTriggered.current = false
      const startTime = Date.now()

      interval.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const currentProgress = Math.min(elapsed / threshold, 1)
        setProgress(currentProgress)
        onProgress?.(currentProgress)
      }, 16) // ~60fps

      timeout.current = setTimeout(() => {
        onLongPress(event)
        longPressTriggered.current = true
        setIsPressed(false) // No longer pressed after action
        setProgress(0)
        clearInterval(interval.current) // Stop the interval
      }, threshold)
    },
    [onLongPress, threshold, onProgress]
  )

  const clear = useCallback(
    (event, shouldTriggerClick = true) => {
      clearTimeout(timeout.current)
      clearInterval(interval.current)

      // Only trigger click if the long press hasn't already fired
      if (shouldTriggerClick && !longPressTriggered.current) {
        onClick?.(event)
      }

      setIsPressed(false)
      setProgress(0)
    },
    [onClick] // Now only depends on onClick
  )

  return {
    onMouseDown: (e) => start(e),
    onTouchStart: (e) => start(e),
    onMouseUp: (e) => clear(e),
    onMouseLeave: (e) => clear(e, false), // Pass false to prevent click on leave
    onTouchEnd: (e) => clear(e),
    isPressed,
    progress,
  }
}
