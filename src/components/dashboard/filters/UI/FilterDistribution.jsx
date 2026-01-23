import { useMemo } from "react"
import { motion } from "framer-motion"
import { countBy } from "lodash"
import { extent, line, curveStep, scaleLinear } from "d3"

export function FilterDistribution({ data, width, height, extentX, range, maskID }) {
  // Prepare data
  const dataCount = useMemo(
    () =>
      Object.entries(countBy(data, Math.floor)).map((e) => ({
        x: e[0],
        y: e[1],
      })),
    [data]
  )

  const valueExtent = useMemo(() => extent(dataCount.map((y) => y.y)), [dataCount])

  const xScale = useMemo(() => scaleLinear(extentX, [0, width]), [data, extentX, width])

  // console.log("FilterDistribution render", { data, extentX, range })

  const yScale = useMemo(
    () => scaleLinear([0, valueExtent[1]], [height, 0]),
    [data, valueExtent, height]
  )

  const lineBuilder = useMemo(
    () =>
      line()
        .curve(curveStep)
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y)),
    [xScale, yScale]
  )

  const linePath = useMemo(() => lineBuilder(dataCount), [lineBuilder, dataCount])

  return (
    <div className="filter-distribution-wrapper">
      <svg className={"filter-distribution"} width={width} height={height}>
        <g>
          <defs>
            <mask id={maskID}>
              <motion.rect
                initial={{ x: 0, y: -1, height: height + 2 }}
                fill="white"
                animate={{
                  x: xScale(range[0]),
                  width: xScale(range[1]) - xScale(range[0]),
                }}
                transition={{ duration: 0.1 }}
              />
            </mask>
          </defs>

          <g transform={`translate(${-10},0)`}>
            {/* <text y={height + 5} fill="white">
              {valueExtent[0]}
            </text> */}
            <text y={height + 5} fill="white">
              0
            </text>
            <text y={-5} fill="white">
              {valueExtent[1]}
            </text>
          </g>

          <g className="axis">
            <line x1={0} y1={height} x2={width} y2={height} stroke="#ffffff" strokeWidth={0.5} />
            <line x1={0} y1={0} x2={0} y2={height} stroke="#ffffff" strokeWidth={0.5} />
          </g>

          <g className="path-group">
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              opacity={0.5}
              transition={{ duration: 0.8, delay: 1 }}
              d={linePath}
              stroke="#ffffff"
              fill="none"
              strokeWidth={1}
            />
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
              d={linePath}
              stroke="#ffffff"
              fill="none"
              strokeWidth={1}
              mask={`url(#${maskID})`}
            />
          </g>
        </g>
      </svg>
    </div>
  )
}
