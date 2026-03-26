import { useRef, useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { TextureDefs } from "../../../common/Textures/TextureDefs"
import { useFilters } from "../../../../contexts/FiltersContext"
import { useMouseMoveSvg } from "../../../hooks/useMouseMove"
import { MotionText } from "../../../common/SVG/MotionText"

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
  mode = "single",
  xScale,
  setLineX,
  hoveredSvg,
  setHoveredSvg,
  isInverted,
}) {
  const { isDragging, setIsDragging } = useFilters()
  const sliderRef = useRef(null)
  const minCursorRef = useRef(null)
  const maxCursorRef = useRef(null)

  const svgCursorPosition = useMouseMoveSvg(sliderRef)
  const [selectionMin, selectionMax] = value

  // ✅ Local visual state — never debounced, always instant
  const [localMin, setLocalMin] = useState(selectionMin)
  const [localMax, setLocalMax] = useState(selectionMax)

  useEffect(() => {
    if (!isDragging) {
      setLocalMin(selectionMin)
      setLocalMax(selectionMax)
    }
  }, [selectionMin, selectionMax, isDragging])

  useEffect(() => {
    setLineX(svgCursorPosition.x)
  }, [svgCursorPosition])

  const middleCursorValue = useMemo(
    () => Math.floor(xScale.invert(svgCursorPosition.x)),
    [xScale, svgCursorPosition],
  )

  const closerCursor = useMemo(() => {
    const distanceToMin = Math.abs(middleCursorValue - selectionMin)
    const distanceToMax = Math.abs(middleCursorValue - selectionMax)

    if (distanceToMin < 8 || distanceToMax < 8) return "over"

    if (distanceToMin < distanceToMax) {
      return "min"
    } else {
      return "max"
    }
  }, [middleCursorValue])

  const sliderColors =
    mode === "double"
      ? { min: "#fff", max: "var(--surface-accent-dark)" }
      : { min: "white", max: "white" }

  // Calculate positions
  const sliderWidth = width - cursorWidth

  // Based on local state
  const minCursorPosition = ((localMin - min) / (max - min)) * sliderWidth
  const maxCursorPosition = ((localMax - min) / (max - min)) * sliderWidth

  // Convert pixel position to value
  const pixelToValue = useCallback(
    (pixelX) => {
      const rect = sliderRef.current?.getBoundingClientRect()
      if (!rect) return min

      const relativeX = Math.max(0, Math.min(pixelX - rect.left - cursorWidth / 2, sliderWidth))
      return min + (relativeX / sliderWidth) * (max - min)
    },
    [min, max, sliderWidth, cursorWidth],
  )

  const handleMinPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)

      const handleMove = (moveEvent) => {
        const clientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
        const newValue = Math.min(pixelToValue(clientX), selectionMax)

        setLocalMin(newValue)
        onChange([newValue, selectionMax])
      }

      const handleEnd = () => {
        setIsDragging(false)

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
    [pixelToValue, selectionMax, onChange],
  )

  const handleMaxPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()

      setIsDragging(true)

      const handleMove = (moveEvent) => {
        const clientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
        const newValue = Math.max(pixelToValue(clientX), selectionMin)
        setLocalMax(newValue)
        onChange([selectionMin, newValue])
      }

      const handleEnd = () => {
        setIsDragging(false)
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
    [pixelToValue, selectionMin, onChange],
  )

  const handleTrackClick = useCallback(
    (e) => {
      const clickValue = pixelToValue(e.clientX)
      const distanceToMin = Math.abs(clickValue - selectionMin)
      const distanceToMax = Math.abs(clickValue - selectionMax)

      console.log("TRACK CLICK")
      if (!hasRange) {
        onChange([Math.min(clickValue, selectionMax), selectionMax])
        return
      }

      if (distanceToMin < distanceToMax) {
        onChange([Math.min(clickValue, selectionMax), selectionMax])
      } else {
        onChange([selectionMin, Math.max(clickValue, selectionMin)])
      }
    },
    [pixelToValue, selectionMin, selectionMax, onChange],
  )

  return (
    <div className="slider-container">
      <svg
        ref={sliderRef}
        width={width}
        height={cursorHeight + 10}
        className="svg-slider"
        onMouseDown={handleTrackClick}
        onMouseEnter={() => setHoveredSvg(true)}
        onMouseLeave={() => setHoveredSvg(false)}
      >
        {hasPattern && <TextureDefs />}

        {!hasPattern && (
          <g id="normal-bg" transform={`translate(${cursorWidth / 2}, ${height / 2})`}>
            {/* Background track - before min */}
            <rect
              width={minCursorPosition}
              height={height}
              fill={isInverted ? "#fff" : "rgba(255,255,255,0.3)"}
              // fillOpacity={0.5}
            />

            {/* Active track - between min and max */}
            <rect
              x={minCursorPosition}
              width={maxCursorPosition - minCursorPosition}
              height={height}
              fill={isInverted ? "rgba(255,255,255,0.3)" : "#fff"}
            />

            {/* Background track - after max */}
            <rect
              x={maxCursorPosition}
              width={sliderWidth - maxCursorPosition}
              height={height}
              fill={isInverted ? "#fff" : "rgba(255,255,255,0.3)"}
              // fillOpacity={0.5}
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

        {hoveredSvg && !isDragging && closerCursor !== "over" && (
          <g>
            <motion.g
              initial={{ x: svgCursorPosition.x }}
              animate={{ x: svgCursorPosition.x }}
              transition={{ duration: 0.1 }}
            >
              <line x1={0} x2={0} y1={0} y2={20} stroke={"black"} strokeWidth={1} />

              <MotionText key={"middle-slider"} y={-3}>
                {middleCursorValue}
              </MotionText>
            </motion.g>

            {closerCursor === "min" ? (
              <motion.line
                initial={{
                  strokeWidth: 0.5,
                  x1: minCursorPosition,
                  x2: svgCursorPosition.x,
                  y1: 10,
                  y2: 10,
                }}
                animate={{
                  x1: minCursorPosition,
                  x2: svgCursorPosition.x,
                  y1: 10,
                  y2: 10,
                }}
                exit={{}}
                transition={{ duration: 0.1 }}
                strokeDasharray={"5 5"}
                stroke="black"
              />
            ) : (
              <motion.line
                initial={{
                  strokeWidth: 0.5,
                  x1: maxCursorPosition,
                  x2: svgCursorPosition.x,
                  y1: 10,
                  y2: 10,
                }}
                animate={{
                  x1: maxCursorPosition,
                  x2: svgCursorPosition.x,
                  y1: 10,
                  y2: 10,
                }}
                exit={{}}
                strokeDasharray={"5 5"}
                transition={{ duration: 0.1 }}
                stroke="black"
              />
            )}
          </g>
        )}

        {/* Min Cursor/Handle */}
        <motion.rect
          ref={minCursorRef}
          x={minCursorPosition}
          y={0}
          id="cursor"
          // className={`min ${mode === "double" && "color"}`}
          // animate={{ fill: sliderColors.min }}
          fill={sliderColors.min}
          width={cursorWidth}
          height={cursorHeight}
          whileHover={{ scale: 0.9, transition: { duration: 0.2 }, cursor: "grab" }}
          whileTap={{
            scale: 1.1,
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
            // className={`max ${mode === "double" && "color"}`}
            fill={sliderColors.max}
            // animate={{ fill: sliderColors.max }}
            width={cursorWidth}
            height={cursorHeight}
            whileHover={{ scale: 0.9, transition: { duration: 0.2 } }}
            whileTap={{ scale: 1.1, transition: { duration: 0.2 } }}
            onMouseDown={handleMaxPointerDown}
            onTouchStart={handleMaxPointerDown}
          />
        )}
        {/* Value display */}
        <AnimatePresence>
          {selectionMin > min && (
            <MotionText
              key={"min-text"}
              className="slider-value"
              x={minCursorPosition + cursorWidth / 2}
              y={-3}
            >
              {Math.floor(selectionMin)}
            </MotionText>
          )}
          {selectionMax < max && (
            <MotionText
              key={"max-text"}
              className="slider-value"
              x={maxCursorPosition + cursorWidth / 2}
              y={-3}
            >
              {Math.floor(selectionMax)}
            </MotionText>
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
