import { useState } from "react"
import { Tooltip } from "../../../common/Tooltip/Tooltip"
import { moveElementInArray } from "../../../../utils/moveChar"
import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"
import { motion } from "motion/react"
import { useCharts } from "../ChartsContext"

export const StateLabels = () => {
  const [hoveredStateLabel, setHoveredStateLabel] = useState()
  const { setStatesOrder, statesOrder } = useData()
  const { palette } = useViz()

  const { h, marginTop, chartScales } = useCharts()
  const { y } = chartScales
  return (
    <g id="state-labels-group">
      {statesOrder.map((name) => {
        return (
          <motion.g
            key={name}
            id={`grid-label-group-${name}`}
            className="gird-label"
            initial={{ x: 0 }}
            animate={{ y: y(name) + marginTop }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseOver={() => setHoveredStateLabel(name)}
            onMouseLeave={() => setHoveredStateLabel()}
          >
            <text className="stateLabel-text" fill={palette[name]} fontSize={4} textAnchor="start">
              {name.length > 15
                ? `${statesOrder.indexOf(name)} • ${name.substring(0, 8)}` + "…"
                : `${statesOrder.indexOf(name)} • ${name}`}
            </text>
            <g className="line-controls" transform={`translate(${10}, ${3})`}>
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
        )
      })}

      <Tooltip isVisible={hoveredStateLabel}>
        <p>{hoveredStateLabel}</p>
      </Tooltip>
    </g>
  )
}
