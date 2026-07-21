import { useCharts } from "../../ChartsContext"

import { scaleLinear, curveStep, sum, max, line, area } from "d3"

import { useDerivedData } from "../../../../../contexts/DerivedDataContext"
import { useLinksAnalytics } from "../../../../hooks/useLinksAnalytics"

import { motion } from "motion/react"

export function StateDensity() {
  const { filteredLinks, selectedLinks } = useDerivedData()

  const { marginTop, chartScales } = useCharts()

  const { x, y } = chartScales

  console.log("f", filteredLinks)
  console.log("s", selectedLinks)

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

  const showComplete = filteredLinks.length === selectedLinks.length

  // Kernel density estimation, weighted by the summed kernel value (not the
  // mean) so a state's curve scales with how many trajectories it actually
  // has, rather than every state's curve integrating to roughly the same
  // total regardless of sample size.
  const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(200))

  // Compute every state's source/target density once, up front, so a single
  // shared scale can be derived from the true max across all of them. states
  // were being clipped into their own fixed [0, 0.01] domain independently,
  // so nearly every state maxed out at the same height regardless of its
  // actual trajectory count — making the lines look identical when they
  // represented very different numbers of patients.
  const densities = linksAnalytics.map((d) => {
    const initialTrajectories = showComplete ? d.complete.initial : d.filtered.initial
    const finalTrajectories = showComplete ? d.complete.final : d.filtered.final
    return {
      state: d.state,
      source: initialTrajectories.length ? kde(initialTrajectories.map((t) => t.source.x)) : null,
      target: finalTrajectories.length ? kde(finalTrajectories.map((t) => t.source.x)) : null,
    }
  })

  const maxDensity =
    max(
      densities.flatMap((d) =>
        [d.source, d.target].filter(Boolean).flatMap((datum) => datum.map((point) => point[1])),
      ),
    ) || 1

  // Zero density sits at the row baseline; the state with the single
  // largest peak reaches a full row's height, everything else scales down
  // proportionally against that same maxDensity — no extrapolation tricks.
  const bandwidth = y.bandwidth()
  const densityYSource = scaleLinear().domain([0, maxDensity]).range([0, -bandwidth])
  const densityYTarget = scaleLinear().domain([0, maxDensity]).range([0, bandwidth])

  const lineGeneratorSource = area()
    .curve(curveStep)
    .x((d) => x(d[0]))
    .y0((d) => densityYSource(d[1]))
    .y1((d) => d[1])
  const lineGeneratorTarget = area()
    .curve(curveStep)
    .x((d) => x(d[0]))
    .y0((d) => densityYTarget(d[1]))
    .y1((d) => d[1])

  return (
    <g id="density">
      {densities.map((d) => (
        <motion.g
          key={`density-state-source-${d.state}`}
          className="density-state-source"
          initial={{ y: y(d.state) + marginTop }}
          animate={{ y: y(d.state) + marginTop }}
          transition={{ duration: 0.2 }}
        >
          <g>
            {d.source && <PathGroup datum={d.source} lineGenerator={lineGeneratorSource} />}
            {d.target && <PathGroup datum={d.target} lineGenerator={lineGeneratorTarget} />}
          </g>
        </motion.g>
      ))}
    </g>
  )
}

const PathGroup = ({ datum, lineGenerator, opacity = 1 }) => {
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
      animate={{
        d: lineGenerator(datum),
        strokeOpacity: opacity,
        fill: "var(--surface-accent)",
        fillOpacity: 0.5,
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
        sum(V, function (v) {
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
