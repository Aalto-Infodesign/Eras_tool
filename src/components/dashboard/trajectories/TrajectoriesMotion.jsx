import { useState, useContext } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"
import { motion, AnimatePresence } from "motion/react"
import { isColorDark } from "../../../utils/colorHelpers"

import { useViz } from "../../../contexts/VizContext"
import { useFilters } from "../../../contexts/FiltersContext"

import "./Trajectories.css"
import { union } from "lodash"
export function TrajectoriesMotion(props) {
  const { filters, selectedTrajectoriesIDs } = useFilters()
  const { palette } = useViz()

  const trajectoriesContext = useContext(TrajectoriesContext)
  const {
    marginTop,
    chartScales,
    selectedLumps,
    toggleSelectedTrajectory,
    filteredLinks,
    hoveredTrajectoriesIDs,
    selectedIndex,
    enableScrub,
  } = trajectoriesContext

  const { showLinesOfSelectedLumps } = props
  const { isSelectModeLines } = props

  const [markerHoveredId, setMarkerHoveredId] = useState(null)
  // Da poi spostare un livello più in alto

  const { x, y } = chartScales

  const rectDimensions = { width: 2, height: 4 }

  const selectedTrajectories =
    filteredLinks.length < 20
      ? filteredLinks.filter((d) => selectedTrajectoriesIDs.includes(d.id))
      : []
  const highlightedTrajectories = enableScrub
    ? filteredLinks.filter((d) => d.id === hoveredTrajectoriesIDs[selectedIndex])
    : []

  const displayedTrajectories = union(selectedTrajectories, highlightedTrajectories)

  const lines =
    (!isSelectModeLines && selectedLumps.length > 0 && showLinesOfSelectedLumps && filteredLinks) ||
    (!isSelectModeLines && displayedTrajectories.length > 0 && displayedTrajectories) ||
    (isSelectModeLines && filteredLinks)

  // const highlightedTrajectories =
  //   isSelectModeLines && filteredLinks.filter((d) => selectedTrajectoriesIDs.includes(d.id))

  const singleStateSwitches = filteredLinks.filter(
    (l) => l.source.state === l.target.state && l.initialState === true && l.finalState === true,
  )

  const singleStatePoints =
    (!isSelectModeLines &&
      selectedLumps.length > 0 &&
      showLinesOfSelectedLumps &&
      singleStateSwitches) ||
    (isSelectModeLines && singleStateSwitches)

  // This function would be called by the triggering element's event handler
  const handleMouseEnter = (d) => {
    // 'd' is the data object from your array
    setMarkerHoveredId(d.id)
  }

  // ...and the cleanup function (onMouseLeave)
  const handleMouseLeave = () => {
    setMarkerHoveredId(null)
  }

  const handleClick = (d) => {
    toggleSelectedTrajectory(d.id)
  }

  return (
    <g id="trajectories">
      <AnimatePresence>
        {singleStatePoints &&
          singleStatePoints.map((d) => {
            return (
              <motion.rect
                key={`singleStateSwitch-${d.id}-${d.lump}-${d.source.x}`}
                id={`singleStateSwitch-${d.id}-${d.lump}-${d.source.x}`}
                className={"singleStateSwitch"}
                initial={{
                  x: x(d.source.x) - rectDimensions.width / 2,
                  y: y(d.source.state) + marginTop - rectDimensions.height / 2,
                  width: 0,
                  height: 0,
                }}
                animate={{
                  x: x(d.source.x) - rectDimensions.width / 2,
                  y: y(d.source.state) + marginTop - rectDimensions.height / 2,
                  width: rectDimensions.width,
                  height: rectDimensions.height,
                  fill: palette[d.source.state],
                }}
                exit={{ height: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => toggleSelectedTrajectory(d.id)}
              >
                <title>{`ID: ${d.id}`}</title>
              </motion.rect>
            )
          })}
        {lines &&
          lines.map((d) => {
            const isHovered = hoveredTrajectoriesIDs.includes(d.id)
            const isSelected = selectedTrajectoriesIDs.includes(d.id)
            {
              /* const isFilteredDate = d.source.date >= filters.date.selection[0] && d.source.date <= filters.date.selection[1] */
            }

            let offset = 0
            if (
              d.source.date >= filters.date.selection[0] &&
              d.source.date <= filters.date.selection[1]
            ) {
              const length = Math.hypot(
                Math.abs(x(d.target.x) - x(d.source.x)),
                Math.abs(y(d.target.state) - y(d.source.state)),
              )
              const startGap = 1
              const endGap = 1.2

              const totalGap = startGap + endGap
              const visibleLength = length - totalGap

              offset = `${visibleLength} ${totalGap} `
            } else {
              if (
                filters.date.selection[0] - d.source.date <
                (filters.date.selection[0] - filters.date.extent[0]) / 2
              )
                offset = "1.1 1.1"
              else offset = " .75 1.5"
            }

            return (
              <motion.line
                key={`switch-${d.id}-${d.lump}-${d.source.x}`}
                id={`switch-${d.id}-${d.lump}-${d.source.x}`}
                // className={`switch `}
                initial={{
                  x1: x(d.source.x),
                  x2: x(d.target.x),
                  y1: y(d.source.state) + marginTop,
                  y2: y(d.target.state) + marginTop,
                  strokeWidth: 0.25,
                  stroke: palette[d.source.state],
                  // strokeDasharray: offset,
                  strokeDashoffset: -1,
                  opacity: 0,
                }}
                animate={{
                  x1: x(d.source.x),
                  x2: x(d.target.x),
                  y1: y(d.source.state) + marginTop,
                  y2: y(d.target.state) + marginTop,

                  // opacity: isFilteredDate ? 0.5 : 1,
                  strokeDasharray: offset,
                  // strokeDashoffset: d.source.date > filters.date.selection[0] ? -1 : 0,
                  strokeWidth: isSelected ? 1.5 : 0.25,
                  stroke: palette[d.source.state],

                  opacity: 1,
                }}
                whileHover={{ strokeWidth: isSelected ? 1.5 : 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  default: { duration: lines.length > 1000 ? 0.0 : 0.2 },
                  strokeWidth: { duration: 0.1 },
                }}
                onClick={() => toggleSelectedTrajectory(d.id)}
              >
                <title>{`ID: ${d.id}`}</title>
              </motion.line>
            )
          })}

        {displayedTrajectories &&
          displayedTrajectories.map((d) => {
            {
              /* const isActive = d.id === markerHoveredId */
            }

            const isSelected = selectedTrajectories.map((t) => t.id).includes(d.id)
            const isHovered = d.id === markerHoveredId

            const isActive = isSelected && isHovered

            const isDark = isColorDark(palette[d.source.state]).isDark

            const textColor = isDark ? "#FFFFFF" : "#000000"
            return (
              <motion.g
                key={`marker-${d.id}-${d.lump}-${d.source.x}`}
                id={`marker-${d.id}-${d.lump}-${d.source.x}`}
                className={`marker ${isActive ? "highlighted" : ""}`}
                initial={{ x: x(d.source.x), y: y(d.source.state) + marginTop }}
                animate={{ x: x(d.source.x), y: y(d.source.state) + marginTop }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSelectedTrajectory(d.id)}
                onMouseEnter={() => handleMouseEnter(d)}
                onMouseLeave={() => handleMouseLeave()}
              >
                <motion.circle
                  className={`marker-circle`}
                  initial={{ fill: palette[d.source.state], r: 0 }}
                  animate={{ fill: palette[d.source.state], r: isActive ? 6 : 1 }}
                  exit={{ r: 0 }}
                  transition={{ duration: 0.2 }}
                />
                {isActive && (
                  <motion.text
                    y={1.5}
                    fill={textColor}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className={`marker-label`}
                  >
                    {d.source.x.toFixed(0)}
                  </motion.text>
                )}
              </motion.g>
            )
          })}
      </AnimatePresence>
    </g>
  )
}
