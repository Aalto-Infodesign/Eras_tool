import { useCharts } from "../ChartsContext"

import { scaleLinear, curveStep, mean, line } from "d3"

import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { useLinksAnalytics } from "../../../hooks/useLinksAnalytics"

import { motion } from "motion/react"

export function StateDensity(props) {
  const { filteredLinks, selectedLinks } = useDerivedData()

  const { marginTop, chartScales } = useCharts()

  const { x, y } = chartScales

  const { hoveredDistribution } = props

  const completeLinksAnalytics = useLinksAnalytics(filteredLinks)
  const selectedLinksAnalytics = useLinksAnalytics(selectedLinks)

  const linksAnalytics = completeLinksAnalytics.map((item) => {
    const match = selectedLinksAnalytics.find((f) => f.state === item.state)
    return {
      state: item.state,
      complete: { initial: item.initialTrajectories, final: item.finalTrajectories },
      filtered: {
        initial: match?.initialTrajectories ?? [],
        final: match?.finalTrajectories ?? [],
      },
    }
  })

  const densityYSource = scaleLinear().domain([0, 0.01]).range([1, 0])
  const densityYTarget = scaleLinear().domain([0, 0.01]).range([0, 1])
  // Compute kernel density estimation
  const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(50))

  const lineGeneratorSource = line()
    .curve(curveStep)
    .x((d) => x(d[0]))
    .y((d) => Math.min(densityYSource(d[1]), 0))
  const lineGeneratorTarget = line()
    .curve(curveStep)
    .x((d) => x(d[0]))
    .y((d) => Math.max(densityYTarget(d[1]), 0))

  return (
    <g id="density">
      {linksAnalytics.map((d) => {
        return (
          <motion.g
            key={`density-state-source-${d.state}`}
            className="density-state-source"
            initial={{ y: y(d.state) + marginTop }}
            animate={{ y: y(d.state) + marginTop }}
          >
            <PathGroup
              name={d.state}
              trajectories={d.complete.initial}
              lineGenerator={lineGeneratorSource}
              opacity={d.filtered.initial.length > 0 && 0.2}
              kde={kde}
            />
            <PathGroup
              name={d.state}
              trajectories={d.complete.final}
              lineGenerator={lineGeneratorTarget}
              opacity={d.filtered.final.length > 0 && 0.2}
              kde={kde}
            />
            <PathGroup
              name={d.state}
              trajectories={d.filtered.initial}
              lineGenerator={lineGeneratorSource}
              kde={kde}
            />
            <PathGroup
              name={d.state}
              trajectories={d.filtered.final}
              lineGenerator={lineGeneratorTarget}
              kde={kde}
            />
          </motion.g>
        )
      })}
    </g>
  )
}

const PathGroup = ({ name, trajectories, lineGenerator, kde, opacity = 1 }) => {
  // const { palette } = useViz()

  if (trajectories.length === 0) return

  const datum = kde(trajectories.map((d) => d.source.x))

  return (
    <motion.path
      initial={{
        stroke: "white",
        strokeWidth: 0.5,
        strokeLinejoin: "round",
        d: lineGenerator(datum),
        strokeOpacity: opacity,
        fill: "none",
      }}
      // fill={palette[name]}
      animate={{
        d: lineGenerator(datum),
        strokeOpacity: opacity,
        fill: "none",
      }}
    />
  )
}

// Function to compute density
function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map(function (x) {
      return [
        x,
        mean(V, function (v) {
          return kernel(x - v)
        }),
      ]
    })
  }
}
function kernelEpanechnikov(k) {
  return function (v) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0
  }
}
