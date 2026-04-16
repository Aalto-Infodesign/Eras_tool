import { useCharts } from "../ChartsContext"
import { ticks } from "d3"

import { useStatesDataFromLinks } from "../../../../utils/lumpsHelpers"

import { AnimatePresence, motion } from "motion/react"

import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"

export function Grid({ chartMode }) {
  const { statesOrder } = useData()
  const { palette } = useViz()
  const { filteredLinks, analytics } = useDerivedData()
  const { w, h, marginTop, chartScales } = useCharts()

  const { ageRange } = analytics

  const xScale = chartScales.x
  const yScale = chartScales.y

  const statesData = useStatesDataFromLinks(filteredLinks)

  const DIV_INCREMENT = 10
  const verticalLines = ticks(
    Math.max(1, ageRange[0] - DIV_INCREMENT),
    ageRange[1],
    ageRange[1] / DIV_INCREMENT,
  )

  const opacity = chartMode !== "arc" ? 1 : 0.4

  return (
    <g id="grid">
      {chartMode !== "arc" && (
        <g id="vertical-lines">
          {verticalLines.map((l) => {
            return (
              <motion.g
                key={`v-line-${l}`}
                initial={{ x: xScale(l) }}
                animate={{ x: xScale(l) }}
                transition={{ duration: 0.2 }}
              >
                <line
                  y1={0}
                  y2={h}
                  stroke="var(--text-primary)"
                  strokeWidth={0.1}
                  opacity={0.3}
                  strokeDasharray={"1 1"}
                />
                <text
                  y={h}
                  fill={"var(--text-primary)"}
                  fontSize={3}
                  opacity={0.3}
                  textAnchor="middle"
                >
                  {l}
                </text>
              </motion.g>
            )
          })}
        </g>
      )}

      <motion.g animate={{ opacity: opacity }}>
        {statesOrder.map((name) => {
          return (
            <motion.g
              key={name}
              initial={{ y: yScale(name) + marginTop }}
              animate={{ y: yScale(name) + marginTop }}
              transition={{ duration: 0.2 }}
              id={`grid-line-group-${name}`}
              className="grid-line"
            >
              <motion.line
                id={`line-${name}`}
                className="h-line"
                initial={{
                  x1: 0,
                  x2: w,
                  strokeWidth: 0,
                  stroke: palette[name],
                }}
                animate={{
                  stroke: palette[name],
                  strokeWidth: 0.5,
                }}
                exit={{ strokeWidth: 0 }}
                transition={{ duration: 0.2 }}
                strokeDasharray={"2 1"}
                cursor={"pointer"}
                opacity={0.5}
              />
            </motion.g>
          )
        })}
      </motion.g>
      <AnimatePresence>
        {statesData.map((d) => {
          const y = yScale(d.state) + marginTop
          return (
            <motion.g
              key={`active-line-${d.state}`}
              initial={{ y: y, opacity: 0 }}
              animate={{ y: y, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.circle
                key={d}
                initial={{ r: 0, cx: xScale(d.median) }}
                animate={{
                  cx: chartMode === "arc" ? w / 2 : xScale(d.median),
                  // cy: yScale(d.state) + marginTop,
                  fill: palette[d.state],
                  r: chartMode === "arc" ? 2 : 0.5,
                }}
                exit={{ r: 0, cx: xScale(d.median) }}
                cx={0}
                transition={{ duration: 0.2 }}
              />
              <motion.line
                key={d.state}
                id={`active-line-${d.state}`}
                className="active-line"
                initial={{
                  x1: xScale(d.xExtent[0]),
                  x2: xScale(d.xExtent[0]),
                }}
                animate={{
                  x1: xScale(d.xExtent[0]),
                  x2: xScale(d.xExtent[1]),
                  opacity: opacity,
                }}
                transition={{ duration: 0.2 }}
                strokeWidth={0.5}
                strokeLinecap="round"
                stroke={palette[d.state]}
              />
            </motion.g>
          )
        })}
      </AnimatePresence>
    </g>
  )
}
