import { motion } from "motion/react"

/**
 * One box plot row per state, assembled from up to two per-state stat objects
 * (see `useStatesDataFromLinks`, whose `quartiles` carry the five-number
 * summary {min, q1, median, q3, max} of `source.x`):
 *
 * - `range`     — the primary source (selected / cluster-weighted links):
 *                 drawn as the thick range line with its median tick.
 * - `fullRange` — optional reference source (the full filtered population):
 *                 drawn as two whiskers (min→q1 and q3→max) with end caps,
 *                 leaving the interquartile center free for the range line.
 *
 * Each summary element is its own subcomponent (Whisker, ExtremeCap, RangeLine,
 * MedianTick, ExtentLabels); BoxPlot coordinates them inside the row group,
 * which is what both the global lump-data loop and the subset scrub loop render.
 * `children` (e.g. scrub dots) are placed on the row baseline.
 */

// Rows translate to `y - BASELINE_OFFSET`; glyphs sit at `+BASELINE_OFFSET`,
// landing on the state's baseline (chartScales.y(state) + marginTop).
const BASELINE_OFFSET = 5

const ExtremeCap = ({ id, x, color, opacity = 1, height = 3, width = 0.5, animationDuration }) => (
  <motion.rect
    id={id}
    className="extreme-line"
    initial={{ x, height, width, y: -height / 2 }}
    animate={{ x, height, width, y: -height / 2, opacity }}
    transition={{ duration: animationDuration }}
    strokeWidth={0}
    fill={color}
  />
)

// One side of the whisker: a thin line from the extreme (`from`, where the end
// cap sits) to the nearest quartile (`to`). A standalone element so the two
// sides never overlap the center piece and can become interactive later.
const Whisker = ({
  state,
  side,
  from,
  to,
  xScale,
  color,
  opacity = 1,
  enterFromY,
  animationDuration,
}) => (
  <motion.g
    id={`whisker-${side}-${state}`}
    className="whisker"
    initial={{ y: enterFromY, opacity: 0 }}
    animate={{ y: BASELINE_OFFSET, opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: animationDuration }}
  >
    <motion.line
      className="whisker-line active-line"
      initial={{ x1: xScale(from), x2: xScale(from) }}
      animate={{ x1: xScale(from), x2: xScale(to), opacity }}
      exit={{ x1: xScale(from), x2: xScale(from) }}
      transition={{ duration: animationDuration }}
      strokeWidth={0.5}
      stroke={color}
    />
    <ExtremeCap
      id={`whisker-cap-${side}-${state}`}
      x={xScale(from)}
      color={color}
      opacity={opacity}
      animationDuration={animationDuration}
    />
  </motion.g>
)

// Thick min→max line of the primary source.
const RangeLine = ({
  variant,
  state,
  quartiles,
  xScale,
  color,
  strokeWidth,
  opacity = 1,
  onHover,
  onClick,
  animationDuration,
}) => (
  <motion.line
    id={`${variant}-lump-line-${state}`}
    className="lump-line"
    initial={{
      x1: xScale(quartiles.min),
      x2: xScale(quartiles.max),
      strokeWidth: 0,
      stroke: color,
      pathLength: 0,
      opacity,
    }}
    animate={{
      x1: xScale(quartiles.min),
      x2: xScale(quartiles.max),
      strokeWidth,
      stroke: color,
      opacity,
      pathLength: 1,
    }}
    exit={{ pathLength: 0, strokeWidth: 0 }}
    transition={{ duration: animationDuration }}
    onMouseEnter={() => onHover(state)}
    onClick={onClick}
  />
)

const MedianTick = ({ state, quartiles, xScale, height, width = 1, animationDuration }) => (
  <motion.rect
    id={`median-line-${state}`}
    className="median-line"
    rx={0}
    initial={{
      width: 0,
      height,
      x: xScale(quartiles.median) - width / 2,
      y: -height / 2,
    }}
    animate={{
      width,
      x: xScale(quartiles.median) - width / 2,
      y: -height / 2,
    }}
    exit={{ width: 0 }}
    transition={{ duration: animationDuration }}
  />
)

// Min / max age labels at the ends of the range line.
const ExtentLabels = ({ state, quartiles, xScale, animationDuration }) => (
  <motion.g id={`lump-labels-${state}`} className="lump-labels">
    <motion.text
      id={`lump-label-start-${state}`}
      className="lump-label-start"
      fontSize={3}
      initial={{ x: xScale(quartiles.min), y: 0, opacity: 0 }}
      animate={{ x: xScale(quartiles.min), y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: animationDuration }}
    >
      {quartiles.min.toFixed(0) + "y"}
    </motion.text>
    <motion.text
      id={`lump-label-end-${state}`}
      className="lump-label-end"
      fontSize={3}
      initial={{ x: xScale(quartiles.max), y: 0, opacity: 0 }}
      animate={{ x: xScale(quartiles.max), y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: animationDuration }}
    >
      {quartiles.max.toFixed(0) + "y"}
    </motion.text>
  </motion.g>
)

export const BoxPlot = ({
  state,
  range,
  fullRange,
  xScale,
  y,
  color,
  variant = "main",
  strokeWidth = 3,
  hasMedian = true,
  hasLabels = false,
  interactive = false,
  onHover = () => {},
  onLeave = () => {},
  onClick,
  animationDuration = 0.2,
  children,
}) => {
  const prefix = variant === "main" ? "" : `${variant}-`

  return (
    <motion.g
      id={`${prefix}lump-line-group-${state}`}
      className={`${prefix}lump-line-group`}
      whileHover={"hovered"}
      initial={{ y: y - BASELINE_OFFSET, opacity: 0 }}
      animate={{ y: y - BASELINE_OFFSET, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: animationDuration }}
      onMouseEnter={interactive ? () => onHover(state) : undefined}
      onMouseLeave={interactive ? () => onLeave() : undefined}
    >
      {/* Transparent rect for interaction */}
      {interactive && (
        <rect
          x={xScale(range.quartiles.min)}
          width={xScale(range.quartiles.max) - xScale(range.quartiles.min)}
          height={BASELINE_OFFSET}
          fill="transparent"
          opacity={0.5}
        />
      )}

      {fullRange && (
        <>
          <Whisker
            state={state}
            side="min"
            from={fullRange.quartiles.min}
            to={range.quartiles.min}
            xScale={xScale}
            color={color}
            enterFromY={BASELINE_OFFSET}
            animationDuration={animationDuration}
          />
          <Whisker
            state={state}
            side="max"
            from={fullRange.quartiles.max}
            to={range.quartiles.max}
            xScale={xScale}
            color={color}
            enterFromY={BASELINE_OFFSET}
            animationDuration={animationDuration}
          />
        </>
      )}

      <motion.g initial={{ y: BASELINE_OFFSET }} animate={{ y: BASELINE_OFFSET }}>
        <RangeLine
          variant={variant}
          state={state}
          quartiles={range.quartiles}
          xScale={xScale}
          color={color}
          strokeWidth={strokeWidth}
          onHover={onHover}
          onClick={onClick}
          animationDuration={animationDuration}
        />

        {hasMedian && (
          <MedianTick
            state={state}
            quartiles={range.quartiles}
            xScale={xScale}
            height={strokeWidth}
            animationDuration={animationDuration}
          />
        )}

        {children}
      </motion.g>

      {hasLabels && (
        <ExtentLabels
          state={state}
          quartiles={range.quartiles}
          xScale={xScale}
          animationDuration={animationDuration}
        />
      )}
    </motion.g>
  )
}
