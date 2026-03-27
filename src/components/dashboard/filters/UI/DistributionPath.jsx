import { AnimatePresence, motion } from "framer-motion"
import { useMemo } from "react"

import { countBy } from "lodash"
import { line, curveStep } from "d3"
import { MotionText } from "../../../common/SVG/MotionText"

export const DistributionPath = ({
  data,
  range,
  localMin,
  localMax,
  color,
  maskID = "defaultID",
  height = 150,
  xScale,
  yScale,
  lineX,
  hoveredSvg,
  isInverted,
}) => {
  const dataCount = useMemo(
    () =>
      Object.entries(countBy(data, Math.floor)).map((e) => ({
        x: e[0],
        y: e[1],
      })),
    [data],
  )

  const lookup = useMemo(() => new Map(dataCount.map((d) => [+d.x, d])), [dataCount])

  const filledData = useMemo(() => range.map((xVal) => lookup.get(xVal) ?? null), [range, lookup])

  const lineBuilder = useMemo(
    () =>
      line()
        .defined((d) => d !== null && d !== undefined && !isNaN(d.y))
        .curve(curveStep)
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y)),
    [xScale, yScale],
  )

  const linePath = useMemo(() => lineBuilder(filledData), [lineBuilder, filledData])

  const yValue = useMemo(() => {
    const xValue = Number(Math.floor(xScale.invert(lineX)))

    return lookup.get(xValue)?.y ?? 0
  }, [lookup, lineX, xScale])

  return (
    <g className="path-group">
      <defs>
        <mask id={maskID}>
          {isInverted ? (
            <>
              <rect width="100%" height="100%" fill="white" />

              <motion.rect
                initial={{ x: 0, y: -1, height: height + 2 }}
                fill="black"
                animate={{
                  x: xScale(localMin),
                  width: xScale(localMax) - xScale(localMin),
                }}
                transition={{ duration: 0.1 }}
              />
            </>
          ) : (
            <motion.rect
              initial={{ x: 0, y: -1, height: height + 2 }}
              fill="var(--text-primary)"
              animate={{
                x: xScale(localMin),
                width: xScale(localMax) - xScale(localMin),
              }}
              transition={{ duration: 0.1 }}
            />
          )}
        </mask>
      </defs>
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        exit={{ pathLength: 0 }}
        opacity={0.5}
        transition={{ duration: 0.8, delay: 0 }}
        d={linePath}
        stroke={color}
        fill="none"
        strokeWidth={1}
      />
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        exit={{ pathLength: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        d={linePath}
        stroke={color}
        fill="none"
        strokeWidth={1}
        mask={`url(#${maskID})`}
      />

      {/* Axis */}
      <AnimatePresence>
        {hoveredSvg && yValue > 0 && (
          <LineRulers x={lineX} y={yScale(yValue)} yValue={yValue} height={height} color={color} />
        )}
      </AnimatePresence>
    </g>
  )
}

function LineRulers({ x, y, yValue, height, color }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.3 },
      }}
    >
      <motion.line
        className="ruler-y"
        initial={{ x1: x, x2: x, y2: height, pathLength: 0 }}
        animate={{
          x1: x,
          x2: x,
          y2: y,
          pathLength: 1,
        }}
        exit={{ pathLength: 0 }}
        transition={{
          default: { duration: 0.1 },
          pathLength: { duration: 0.2 },
        }}
        y1={height}
        stroke={color}
        strokeWidth={0.5}
      />
      <motion.line
        className="ruler-x"
        initial={{
          x2: x,
          y1: y,
          y2: y,
        }}
        animate={{
          x2: x,
          y1: y,
          y2: y,
          pathLength: 1,
        }}
        exit={{ pathLength: 0 }}
        transition={{
          default: { duration: 0.1 },
          pathLength: { duration: 0.2 },
        }}
        x1={0}
        stroke={color}
        strokeWidth={0.5}
      />
      <motion.g
        initial={{ x: x, y: y }}
        animate={{ x: x, y: y }}
        transition={{
          default: { duration: 0.1 },
        }}
      >
        <circle cx={0} cy={0} r={3} fill="var(--surface-accent)" stroke="#000" strokeWidth={2} />
        <motion.g animate={{ y: -10 }}>
          <rect
            width={20}
            height={16}
            x={-10}
            y={-12}
            style={{ fill: "var(--surface-contrast)" }}
            fillOpacity={0.7}
          />

          <MotionText key={"pin-label"}>{yValue}</MotionText>
        </motion.g>
      </motion.g>
    </motion.g>
  )
}
