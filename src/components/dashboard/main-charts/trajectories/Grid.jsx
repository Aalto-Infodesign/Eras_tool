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
                  // pathLength: 0,
                  strokeDasharray: "0 1",
                }}
                animate={{
                  stroke: palette[name],
                  strokeWidth: 0.5,
                  // pathLength: 1,
                  strokeDasharray: "2 1",
                }}
                exit={{ strokeWidth: 0 }}
                transition={{ delay: 1, duration: 0.2 }}
                strokeDasharray={"2 1"}
                cursor={"pointer"}
                opacity={0.5}
              />
            </motion.g>
          )
        })}
      </motion.g>
    </g>
  )
}
