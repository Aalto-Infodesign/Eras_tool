import { AnimatePresence, motion } from "motion/react"
import { useRef, useCallback } from "react"
import { TextureDefs } from "../../../common/Textures/TextureDefs"

export function FilterSlider({
  min = 0,
  max = 100,
  value = [0, 100], // [min, max] for range
  onChange,
  width = 300,
  height = 10,
  cursorHeight = 20,
  cursorWidth = 6,
  hasPattern = false,
  hasRange = false,
}) {
  const sliderRef = useRef(null)
  const minCursorRef = useRef(null)
  const maxCursorRef = useRef(null)

  // console.log(min)
  // console.log(max)
  // console.log(value)

  const [rangeMin, rangeMax] = value

  // Calculate positions
  const sliderWidth = width - cursorWidth
  const minCursorPosition = ((rangeMin - min) / (max - min)) * sliderWidth
  const maxCursorPosition = ((rangeMax - min) / (max - min)) * sliderWidth

  // Convert pixel position to value
  const pixelToValue = useCallback(
    (pixelX) => {
      const rect = sliderRef.current?.getBoundingClientRect()
      if (!rect) return min

      const relativeX = Math.max(0, Math.min(pixelX - rect.left - cursorWidth / 2, sliderWidth))
      return min + (relativeX / sliderWidth) * (max - min)
    },
    [min, max, sliderWidth, cursorWidth]
  )

  const handleMinPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()

      const handleMove = (moveEvent) => {
        const clientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
        const newValue = Math.min(pixelToValue(clientX), rangeMax)
        onChange?.([newValue, rangeMax])
      }

      const handleEnd = () => {
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleEnd)
        document.removeEventListener("touchmove", handleMove)
        document.removeEventListener("touchend", handleEnd)
      }

      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleEnd)
      document.addEventListener("touchmove", handleMove, { passive: false })
      document.addEventListener("touchend", handleEnd)
    },
    [pixelToValue, rangeMax, onChange]
  )

  const handleMaxPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()

      const handleMove = (moveEvent) => {
        const clientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
        const newValue = Math.max(pixelToValue(clientX), rangeMin)
        onChange?.([rangeMin, newValue])
      }

      const handleEnd = () => {
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleEnd)
        document.removeEventListener("touchmove", handleMove)
        document.removeEventListener("touchend", handleEnd)
      }

      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleEnd)
      document.addEventListener("touchmove", handleMove, { passive: false })
      document.addEventListener("touchend", handleEnd)
    },
    [pixelToValue, rangeMin, onChange]
  )

  const handleTrackClick = useCallback(
    (e) => {
      const clickValue = pixelToValue(e.clientX)
      const distanceToMin = Math.abs(clickValue - rangeMin)
      const distanceToMax = Math.abs(clickValue - rangeMax)

      if (!hasRange) {
        onChange?.([Math.min(clickValue, rangeMax), rangeMax])
        return
      }

      if (distanceToMin < distanceToMax) {
        onChange?.([Math.min(clickValue, rangeMax), rangeMax])
      } else {
        onChange?.([rangeMin, Math.max(clickValue, rangeMin)])
      }
    },
    [pixelToValue, rangeMin, rangeMax, onChange]
  )

  return (
    <div className="slider-container">
      <svg
        ref={sliderRef}
        width={width}
        height={cursorHeight + 10}
        className="svg-slider"
        onMouseDown={handleTrackClick}
      >
        {hasPattern && <TextureDefs />}

        {!hasPattern && (
          <g id="normal-bg" transform={`translate(${cursorWidth / 2}, ${height / 2})`}>
            {/* Background track - before min */}
            <rect width={minCursorPosition} height={height} style={{ opacity: 0.5 }} />

            {/* Active track - between min and max */}
            <rect
              x={minCursorPosition}
              width={maxCursorPosition - minCursorPosition}
              height={height}
              fill="rgba(255,255,255,0.8)"
            />

            {/* Background track - after max */}
            <rect
              x={maxCursorPosition}
              width={sliderWidth - maxCursorPosition}
              height={height}
              style={{ opacity: 0.5 }}
            />
          </g>
        )}
        {hasPattern && (
          <g id="pattern-bg" transform={`translate(${cursorWidth / 2}, ${height / 2})`}>
            <rect
              id="remote"
              height={height}
              width={minCursorPosition / 2}
              style={{ fill: "url(#mini-patternCircles)", opacity: 0.5 }}
            />
            <rect
              id="past"
              x={minCursorPosition / 2}
              width={minCursorPosition / 2}
              height={height}
              style={{ fill: "url(#mini-patternLines)", opacity: 0.5 }}
            />
            <rect
              x={minCursorPosition}
              width={maxCursorPosition - minCursorPosition}
              height={height}
              fill="rgba(255,255,255,0.8)"
            />
            <rect
              x={maxCursorPosition}
              width={sliderWidth - maxCursorPosition}
              height={height}
              style={{ opacity: 0.5 }}
            />
          </g>
        )}

        {/* Min Cursor/Handle */}
        <motion.rect
          ref={minCursorRef}
          x={minCursorPosition}
          y={0}
          id="cursor"
          width={cursorWidth}
          height={cursorHeight}
          whileHover={{ scale: 0.9, transition: { duration: 0.2 }, cursor: "grab" }}
          whileTap={{
            scale: 1.1,
            // fill: "var(--surface-accent)",
            transition: { duration: 0.2 },
            cursor: "grabbing",
          }}
          onMouseDown={handleMinPointerDown}
          onTouchStart={handleMinPointerDown}
        />
        {/* Max Cursor/Handle */}
        {hasRange && (
          <motion.rect
            ref={maxCursorRef}
            x={maxCursorPosition}
            y={0}
            id="cursor"
            width={cursorWidth}
            height={cursorHeight}
            whileHover={{ scale: 0.9, transition: { duration: 0.2 } }}
            whileTap={{ scale: 1.1, fill: "--surface-accent", transition: { duration: 0.2 } }}
            onMouseDown={handleMaxPointerDown}
            onTouchStart={handleMaxPointerDown}
          />
        )}
        {/* Value display */}
        <AnimatePresence>
          {rangeMin > min && (
            <motion.text
              key={"min-text"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="slider-value"
              x={minCursorPosition + cursorWidth / 2}
              y={-3}
              fill="white"
              textAnchor="middle"
              fontSize="12"
            >
              {Math.floor(rangeMin)}
            </motion.text>
          )}
          {rangeMax < max && (
            <motion.text
              key={"max-text"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="slider-value"
              x={maxCursorPosition + cursorWidth / 2}
              y={-3}
              fill="white"
              textAnchor="middle"
              fontSize="12"
            >
              {Math.floor(rangeMax)}
            </motion.text>
          )}
        </AnimatePresence>
      </svg>
      <div className="slider-labels">
        <span>{Math.floor(min)}</span>
        <span>{Math.floor(max)}</span>
      </div>
    </div>
  )
}
