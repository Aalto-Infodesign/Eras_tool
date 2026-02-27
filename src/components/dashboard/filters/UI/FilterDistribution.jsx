import { useMemo, useCallback } from "react"
import { AnimatePresence, motion } from "motion/react"
import { countBy } from "lodash"
import { extent, scaleLinear } from "d3"

import { DistributionPath } from "./DistributionPath"
import { MotionText } from "../../../common/SVG/MotionText"

export function FilterDistribution({
  data,
  width,
  height,
  extentX,
  range,
  selection,
  maskID,
  color = "#fff",
  mode = "single",
  xScale,
  lineX,
  hoveredSvg,
}) {
  const dataToCount = mode === "double" ? data.all : data

  // Prepare data
  const { dataCount, countedBy } = useMemo(() => {
    const countedBy = countBy(dataToCount, Math.floor)

    const dataCount = Object.entries(countedBy).map((e) => ({
      x: e[0],
      y: e[1],
    }))

    return { dataCount, countedBy }
  }, [data])

  const lookup = useMemo(() => new Map(dataCount.map((d) => [d.x, d])), [dataCount])

  // const filledData = useMemo(() => range.map((xVal) => lookup.get(xVal) ?? 0), [range, lookup])

  // console.log(filledData)

  const valueExtent = useMemo(() => extent(dataCount, (c) => c.y), [dataCount])

  const yScale = useMemo(
    () => scaleLinear([0, valueExtent[1]], [height, 0]),
    [data, valueExtent, height],
  )

  const getCountAtX = useCallback(
    (lineX) => {
      const xValue = Math.floor(xScale.invert(lineX))

      if (countedBy[xValue] !== undefined) return countedBy[xValue]

      // Find nearest neighbours
      const keys = Object.keys(countedBy)
        .map(Number)
        .sort((a, b) => a - b)
      const lower = keys.findLast((k) => k <= xValue)
      const upper = keys.find((k) => k >= xValue)

      if (lower === undefined) return countedBy[upper] ?? 0
      if (upper === undefined) return countedBy[lower] ?? 0

      // Linear interpolation between neighbours
      const t = (xValue - lower) / (upper - lower)
      return countedBy[lower] + t * (countedBy[upper] - countedBy[lower])
    },
    [countedBy, xScale],
  )

  const sharedPathProps = { range, selection, height, xScale, yScale, extentX, width }

  const yValue = useMemo(() => {
    const xValue = String(Math.floor(xScale.invert(lineX)))
    return lookup.get(xValue)?.y ?? 0
  }, [lookup, lineX, xScale])

  return (
    <div className="filter-distribution-wrapper">
      <svg className={"filter-distribution"} width={width} height={height}>
        <g>
          <g transform={`translate(${-10},0)`}>
            {/* <text y={height + 5} fill="white">
              {valueExtent[0]}
            </text> */}
            <text y={height + 5} fontSize={10} fill="white">
              0
            </text>
            <text y={-5} fontSize={10} fill="white">
              {valueExtent[1]}
            </text>
          </g>

          <g className="axis">
            <line x1={0} y1={height} x2={width} y2={height} stroke={color} strokeWidth={0.5} />
            <line x1={0} y1={0} x2={0} y2={height} stroke={color} strokeWidth={0.5} />
          </g>

          {mode === "double" ? (
            <g>
              <DistributionPath
                data={data.min}
                color={"#fff"}
                maskID={maskID + "-min"}
                {...sharedPathProps}
              />
              <DistributionPath
                data={data.max}
                color={"var(--surface-accent-dark)"}
                maskID={maskID + "-max"}
                {...sharedPathProps}
              />
            </g>
          ) : (
            <DistributionPath data={data} color={color} maskID={maskID} {...sharedPathProps} />
          )}
          <AnimatePresence>
            {hoveredSvg && (
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
                  initial={{ x1: lineX, x2: lineX, y2: height, pathLength: 0 }}
                  animate={{
                    x1: lineX,
                    x2: lineX,
                    y2: yScale(yValue),
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
                    x2: lineX,
                    y1: yScale(yValue),
                    y2: yScale(yValue),
                  }}
                  animate={{
                    x2: lineX,
                    y1: yScale(yValue),
                    y2: yScale(yValue),
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
                  initial={{ x: lineX, y: yScale(yValue) }}
                  animate={{ x: lineX, y: yScale(yValue) }}
                  transition={{
                    default: { duration: 0.1 },
                  }}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={3}
                    fill="var(--surface-accent)"
                    stroke="#000"
                    strokeWidth={2}
                  />
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
            )}
          </AnimatePresence>
        </g>
      </svg>
    </div>
  )
}
