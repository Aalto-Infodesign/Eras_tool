import { extent, scaleLinear } from "d3"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { useCharts } from "../ChartsContext"
import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { Tooltip } from "../../../common/Tooltip/Tooltip"
import { useFilters } from "../../../../contexts/FiltersContext"
import { useStatesDataFromLinks } from "../../../../utils/lumpsHelpers"

export const ArcContainer = () => {
  const { h } = useCharts()

  return (
    <div className="chart-container">
      <div id="trajectories-chart" className="svg-container">
        <svg preserveAspectRatio="xMidYMid meet" viewBox={`0 0 210 ${h}`}>
          <ArcChart />
        </svg>
      </div>
    </div>
  )
}

export const ArcChart = () => {
  const { statesOrder } = useData()
  const { palette } = useViz()
  const { chartScales, marginTop, w } = useCharts()
  const { lumps, selectedLinks } = useDerivedData()
  const { toggleSelectedLumps, selectedLumps } = useFilters()

  const { x, y } = chartScales

  const statesData = useStatesDataFromLinks(selectedLinks)

  const [hoveredLump, setHoveredLump] = useState(null)

  const valuesExtent = extent(lumps.map((l) => l.count))
  console.log("valuesExtent", valuesExtent)
  // const strokeScale = scaleLinear(valuesExtent, [0.5, 5])
  const opacityScale = scaleLinear(valuesExtent, [0.1, 1])

  return (
    <motion.g id={"arc-chart"} initial={{ x: 0 }} animate={{ x: w / 2 - 1 }}>
      <g id="links">
        <AnimatePresence>
          {lumps.map((l) => {
            const isSelected = selectedLumps.map((s) => s.type).includes(l.type)

            return (
              <motion.path
                key={`segment-${l.source}–${l.target}`}
                initial={{
                  strokeOpacity: opacityScale(l.count),
                  strokeWidth: 0,
                  pathLength: 0,
                }}
                animate={{
                  d: verticalArcGenerator(0, y(l.source) + marginTop, 0, y(l.target) + marginTop),
                  strokeOpacity: isSelected ? 1 : opacityScale(l.count),
                  strokeWidth: isSelected ? 2 : 1,
                  pathLength: 1,
                  stroke: `url(#gradient-${l.source}-${l.target})`,
                }}
                whileHover={{ strokeWidth: 1.5, strokeOpacity: 1, cursor: "pointer" }}
                exit={{
                  strokeWidth: 1,
                  pathLength: 0,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                d={verticalArcGenerator(0, y(l.source) + marginTop, 0, y(l.target) + marginTop)}
                fill="none"
                strokeLinecap={"round"}
                onClick={() => toggleSelectedLumps(l)}
                onMouseEnter={() => setHoveredLump(l)}
                onMouseLeave={() => setHoveredLump(null)}
              />
            )
          })}
        </AnimatePresence>
      </g>

      <AnimatePresence>
        <g id="nodes">
          {statesData.map((s) => (
            <motion.circle
              key={s}
              initial={{ r: 0, cx: x(s.median) }}
              animate={{ cx: 0, cy: y(s.state) + marginTop, fill: palette[s.state], r: 2 }}
              exit={{ r: 0, cx: x(s.median) }}
              cx={0}
              transition={{ duration: 0.2 }}
            />
          ))}
        </g>
      </AnimatePresence>

      {hoveredLump && (
        <Tooltip isVisible={hoveredLump}>
          <p>
            From <span>{hoveredLump.source}</span>
          </p>
          <p>
            to <span>{hoveredLump.target}</span>
          </p>
          <p>
            <span>{hoveredLump.value}</span> individuals
          </p>
        </Tooltip>
      )}
    </motion.g>
  )
}

const verticalArcGenerator = (xStart, yStart, xEnd, yEnd) => {
  return [
    // the arc starts at the coordinate xStart, yStart
    "M",
    xStart,
    yStart,
    // A means we're gonna build an Elliptical Arc Curve
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#elliptical_arc_curve
    "A",
    ((yStart - yEnd) / 2) * 1.5, // rx: first radii of the ellipse (inflexion point)
    (yStart - yEnd) / 2, // ry: second radii of the ellipse  (inflexion point)
    0, // angle: rotation (in degrees) of the ellipse relative to the x-axis
    1, // large-arc-flag: large arc (1) or small arc (0)
    yStart < yEnd ? 0 : 0, // sweep-flag: the clockwise turning arc (1) or counterclockwise turning arc (0)
    // Position of the end of the arc
    xEnd,
    ",",
    yEnd,
  ].join(" ")
}
