import { extent, scaleLinear } from "d3"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { useCharts } from "../ChartsContext"
import { Grid } from "../trajectories/Grid"
import { countBy, map } from "lodash"

export const ArcChart = ({}) => {
  const { h, chartScales, marginTop } = useCharts()
  const { filteredLinks } = useDerivedData()

  const { x, y } = chartScales

  const links = map(
    countBy(filteredLinks, (l) => [l.source.state, l.target.state]),
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
  const strokeScale = scaleLinear(valuesExtent, [0.5, 5])

  console.log(links)

  return (
    <div className="chart-container">
      <div id="trajectories-chart" className="svg-container">
        <svg preserveAspectRatio="xMidYMid meet" viewBox={`0 0 210 ${h}`}>
          <Grid />

          <g>
            {links.map((l) => (
              <path
                d={verticalArcGenerator(10, y(l.source) + marginTop, 10, y(l.target) + marginTop)}
                strokeWidth={strokeScale(l.value)}
                stroke="white"
                fill="none"
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
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
    ((yStart - yEnd) / 2) * 2, // rx: first radii of the ellipse (inflexion point)
    (yStart - yEnd) / 2, // ry: second radii of the ellipse  (inflexion point)
    0, // angle: rotation (in degrees) of the ellipse relative to the x-axis
    1, // large-arc-flag: large arc (1) or small arc (0)
    yStart < yEnd ? 1 : 0, // sweep-flag: the clockwise turning arc (1) or counterclockwise turning arc (0)
    // Position of the end of the arc
    xEnd,
    ",",
    yEnd,
  ].join(" ")
}
