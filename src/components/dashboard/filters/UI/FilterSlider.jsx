import { TextureDefs } from "../../../common/defs/Textures/TextureDefs"
import { useFilters } from "../../../../contexts/FiltersContext"
import { Slider } from "../../../common/Slider/Slider"

/**
 * Filter-specific adapter around the generic <Slider>: wires the shared
 * dragging state from FiltersContext, maps `mode` to handle colors and
 * renders the textured track when `hasPattern` is set.
 */
export function FilterSlider({
  min = 0,
  max = 100,
  localMin,
  setLocalMin,
  localMax,
  setLocalMax,
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
  isInverted = "false",
}) {
  const { isDragging, setIsDragging } = useFilters()

  const sliderColors =
    mode === "double"
      ? { min: "#fff", max: "var(--surface-accent-dark)" }
      : { min: "white", max: "white" }

  const renderPatternTrack = ({ minCursorPosition, maxCursorPosition, sliderWidth }) => (
    <>
      <TextureDefs />
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
    </>
  )

  return (
    <Slider
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      width={width}
      height={height}
      cursorHeight={cursorHeight}
      cursorWidth={cursorWidth}
      hasRange={hasRange}
      isInverted={isInverted}
      colors={sliderColors}
      localMin={localMin}
      setLocalMin={setLocalMin}
      localMax={localMax}
      setLocalMax={setLocalMax}
      hoveredSvg={hoveredSvg}
      setHoveredSvg={setHoveredSvg}
      isDragging={isDragging}
      onDraggingChange={setIsDragging}
      onCursorMove={setLineX}
      xScale={xScale}
      renderTrack={hasPattern ? renderPatternTrack : undefined}
    />
  )
}
