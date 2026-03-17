import { useContext } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"
import { ticks } from "d3"

import { getMinMaxStateFromTrajectories } from "../../../utils/getMinMax"

import { AnimatePresence, motion } from "motion/react"

import { moveElementInArray } from "../../../utils/moveChar"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { flattenDeep } from "lodash"

export function Grid(props) {
  const {
    //  analytics,
    setStatesOrder,
    statesOrder,
    trajectories,
  } = useData()
  const { palette } = useViz()
  const { filteredTrajectories, analytics } = useDerivedData()
  const trajectoriesContext = useContext(TrajectoriesContext)
  const { w, h, marginTop, chartScales } = trajectoriesContext

  const t = !filteredTrajectories ? trajectories : filteredTrajectories
  const { setHoveredStateLabel = () => {} } = props

  const { ageRange } = analytics

  const xScale = chartScales.x
  const yScale = chartScales.y

  const minMaxStates = getMinMaxStateFromTrajectories(flattenDeep(t))

  const verticalLines = ticks(1, ageRange[1], ageRange[1] / 10)

  return (
    <g id="grid">
      {verticalLines.map((l) => {
        return (
          <line
            key={`v-line-${l}`}
            x1={xScale(l)}
            x2={xScale(l)}
            y1={0}
            y2={h}
            stroke="white"
            strokeWidth={0.1}
            opacity={0.3}
            strokeDasharray={"1 1"}
          />
        )
      })}
      {statesOrder.map((name) => {
        return (
          <motion.g
            exit={{ opacity: 0 }}
            key={name}
            id={`grid-line-group-${name}`}
            className="grid-line"
          >
            <motion.line
              id={`line-${name}`}
              className="h-line"
              initial={{
                x1: 0,
                x2: w,
                y1: yScale(name) + marginTop,
                y2: yScale(name) + marginTop,
                strokeWidth: 0,
                stroke: palette[name],
              }}
              animate={{
                y1: yScale(name) + marginTop,
                y2: yScale(name) + marginTop,
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
              animate={{ y: yScale(name) + marginTop - 3 }}
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
                  ? `${statesOrder.indexOf(name)} • ${name.substring(0, 8)}` + "..."
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

      {minMaxStates.map((d) => {
        const y = yScale(d.state) + marginTop
        return (
          <motion.line
            key={d.state}
            id={`active-line-${d.state}`}
            className="active-line"
            initial={{
              x1: xScale(d.x[0]),
              x2: xScale(d.x[1]),
              y1: y,
              y2: y,
            }}
            animate={{ y1: y, y2: y }}
            transition={{ duration: 0.2 }}
            strokeWidth={0.5}
            strokeLinecap="round"
            stroke={palette[d.state]}
          />
        )
      })}
    </g>
  )
}
