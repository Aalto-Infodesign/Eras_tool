import { motion } from "framer-motion"
import { useMemo } from "react"

import { countBy } from "lodash"
import { extent, line, curveStep, curveStepAfter, scaleLinear } from "d3"

export const DistributionPath = ({
  data,
  range,
  selection,
  color,
  maskID = "defaultID",
  height = 150,
  xScale,
  yScale,
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
  return (
    <g className="path-group">
      <defs>
        <mask id={maskID}>
          <motion.rect
            initial={{ x: 0, y: -1, height: height + 2 }}
            fill="white"
            animate={{
              x: xScale(selection[0]),
              width: xScale(selection[1]) - xScale(selection[0]),
            }}
            transition={{ duration: 0.1 }}
          />
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
    </g>
  )
}
