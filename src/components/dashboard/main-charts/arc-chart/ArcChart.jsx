import { extent, scaleLinear } from "d3"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { useCharts } from "../ChartsContext"
import { countBy, map } from "lodash"
import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { Tooltip } from "../../../common/Tooltip/Tooltip"

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
  const { selectedLinks } = useDerivedData()

  const { y } = chartScales

  const [hoveredLink, setHoveredLink] = useState(null)

  const links = map(
    countBy(selectedLinks, (l) => [l.source.state, l.target.state]),
    (value, key) => {
      const [source, target] = key.split(",")
      // TODO Left or Right based if it is going DOWN or UP

      return {
        source: source,
        target: target,
        value: value,
      }
    },
  )

  const valuesExtent = extent(links.map((l) => l.value))
  // const strokeScale = scaleLinear(valuesExtent, [0.5, 5])
  const opacityScale = scaleLinear(valuesExtent, [0.1, 1])

  console.log(links)

  return (
    <motion.g id={"arc-chart"} initial={{ x: w / 2 }} animate={{ x: w / 2 }}>
      <g id="links">
        <AnimatePresence>
          {links.map((l) => (
            <motion.path
              key={`segment-${l.source}–${l.target}`}
              initial={{
                strokeOpacity: opacityScale(l.value),
                strokeWidth: 0,
                pathLength: 0,
              }}
              animate={{
                strokeOpacity: opacityScale(l.value),
                strokeWidth: 1,
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
              onMouseEnter={() => setHoveredLink(l)}
              onMouseLeave={() => setHoveredLink(null)}
            />
          ))}
        </AnimatePresence>
      </g>

      <g id="nodes">
        {statesOrder.map((s) => (
          <motion.circle
            key={s}
            animate={{ cy: y(s) + marginTop, fill: palette[s] }}
            cx={0}
            r={3}
            transition={{ duration: 0.2 }}
          />
        ))}
      </g>

      {hoveredLink && (
        <Tooltip isVisible={hoveredLink}>
          <p>
            From <span>{hoveredLink.source}</span>
          </p>
          <p>
            to <span>{hoveredLink.target}</span>
          </p>
          <p>
            <span>{hoveredLink.value}</span> individuals
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
