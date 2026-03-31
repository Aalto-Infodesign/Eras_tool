import { useCharts } from "../ChartsContext"
import { ticks } from "d3"

import {
  getMinMaxStateFromTrajectories,
  useStatesDataFromLinks,
} from "../../../../utils/lumpsHelpers"

import { AnimatePresence, motion } from "motion/react"

import { moveElementInArray } from "../../../../utils/moveChar"

import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { flattenDeep } from "lodash"
import { useState } from "react"
import { Tooltip } from "../../../common/Tooltip/Tooltip"

export function Grid({ chartMode }) {
  const { setStatesOrder, statesOrder } = useData()
  const { palette } = useViz()
  const { filteredLinks, analytics } = useDerivedData()
  const { w, h, marginTop, chartScales } = useCharts()

  const [hoveredStateLabel, setHoveredStateLabel] = useState()

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
      {chartMode !== "arc" &&
        verticalLines.map((l) => {
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
              <motion.g
                id={`grid-label-group-${name}`}
                className="gird-label"
                initial={{ x: w + 5 }}
                animate={{ y: -3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onMouseOver={() => setHoveredStateLabel(name)}
                onMouseLeave={() => setHoveredStateLabel()}
              >
                <text
                  className="stateLabel-text"
                  y={4}
                  fill={palette[name]}
                  fontSize={4}
                  textAnchor="start"
                >
                  {name.length > 15
                    ? `${statesOrder.indexOf(name)} • ${name.substring(0, 8)}` + "…"
                    : `${statesOrder.indexOf(name)} • ${name}`}
                </text>
                <g className="line-controls" transform={`translate(${10}, ${7})`}>
                  <motion.path
                    className={`stateLabel-control-up material-icons small ${
                      statesOrder.indexOf(name) === 0 ? "inactive" : ""
                    }`}
                    transform={`translate(0, -9)`}
                    d="M-1.5,0 L1.5,0 L0,-2 Z"
                    // whileHover={{ scale: 0.95 }}
                    fill={palette[name]}
                    onClick={() => moveElementInArray(statesOrder, name, "up", setStatesOrder)}
                  />
                  <motion.path
                    className={`stateLabel-control-down material-icons small ${
                      statesOrder.indexOf(name) === statesOrder.length - 1 ? "inactive" : ""
                    }`}
                    transform={`translate(0, 0)`}
                    // whileHover={{ scale: 0.95 }}
                    d="M-1.5,0 L1.5,0 L0,2 Z"
                    fill={palette[name]}
                    onClick={() => moveElementInArray(statesOrder, name, "down", setStatesOrder)}
                  />
                </g>
              </motion.g>
            </motion.g>
          )
        })}
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
      </motion.g>
      <Tooltip isVisible={hoveredStateLabel}>
        <p>{hoveredStateLabel}</p>
      </Tooltip>
    </g>
  )
}
