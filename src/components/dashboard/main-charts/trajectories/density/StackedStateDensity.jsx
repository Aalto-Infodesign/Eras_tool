import { useMemo } from "react"
import { useCharts } from "../../ChartsContext"

import { scaleLinear, curveStep, sum, max, area, stack } from "d3"
import { groupBy } from "lodash"

import { useDerivedData } from "../../../../../contexts/DerivedDataContext"
import { useClustering } from "../../../../../contexts/ClusteringContext"

import { motion } from "motion/react"

import styles from "./Density.module.css"

// Stacked in this order from the row's baseline outward.
const LAYERS = ["initial", "passing", "final"]
const LAYER_OPACITY = { initial: 0.5, passing: 0.5, final: 0.5 }
const LAYER_COLOR = { initial: "green", passing: "yellow", final: "red" }

export function StackedStateDensity() {
  const { selectedLinks } = useDerivedData()
  const { scopedLinks, hasClusterSelection } = useClustering()
  const { marginTop, chartScales } = useCharts()

  const { x, y } = chartScales

  // useTrajectoriesFromData builds exactly one link per trajectory index —
  // `link.source.state` is that index's state for every index, including the
  // last (whose `target` is a synthetic self-loop back onto itself, just to
  // carry `finalState`). So grouping by `source.state` alone already gives
  // exactly one entry per visit; grouping by `target.state` would double
  // count a trajectory's final state (once via the real arrival link, whose
  // `finalState` is false, and again via that closing self-loop).
  function breakdownByState(links) {
    const bySource = groupBy(links, "source.state")

    return Object.keys(bySource)
      .sort()
      .map((state) => {
        const items = bySource[state]
        return {
          state,
          initial: items.filter((l) => l.initialState),
          passing: items.filter((l) => !l.initialState && !l.finalState),
          // A single-state trajectory (initialState && finalState on its one
          // link) is already counted via `initial` above, so it's excluded
          // here to avoid counting that one visit twice.
          final: items.filter((l) => l.finalState && !l.initialState),
        }
      })
  }

  // The reference envelope: the full distribution regardless of cluster
  // selection — reacts only to the app's existing filters (selectedLinks),
  // so it also fixes the set/order of state rows drawn, independent of
  // whatever cluster is selected.
  const totalBreakdown = useMemo(() => breakdownByState(selectedLinks), [selectedLinks])

  // The (possibly cluster-narrowed) composition drawn inside that envelope.
  const scopedBreakdown = useMemo(() => {
    const map = new Map()
    for (const entry of breakdownByState(scopedLinks)) map.set(entry.state, entry)
    return map
  }, [scopedLinks])

  // Kernel density estimation, weighted by the summed kernel value (not the
  // mean) so a state's curve scales with how many trajectories it actually
  // has, rather than every state's curve integrating to roughly the same
  // total regardless of sample size.
  const ticks = x.ticks(300)
  const kde = kernelDensityEstimator(kernelEpanechnikov(7), ticks)

  // Compute every state's densities once, up front, so a single shared scale
  // can be derived from the true max across all of them — otherwise each
  // state clips into its own domain and every curve maxes out the same
  // height regardless of its actual trajectory count.
  const densities = useMemo(() => {
    return totalBreakdown.map(
      ({ state, initial: totalInitial, passing: totalPassing, final: totalFinal }) => {
        const totalAges = [...totalInitial, ...totalPassing, ...totalFinal].map((l) => l.source.x)
        const { initial = [], passing = [], final = [] } = scopedBreakdown.get(state) ?? {}

        const totalDensity = kde(totalAges)
        const initialDensity = kde(initial.map((l) => l.source.x))
        const passingDensity = kde(passing.map((l) => l.source.x))
        const finalDensity = kde(final.map((l) => l.source.x))

        const rows = ticks.map((tick, i) => ({
          x: tick,
          total: totalDensity[i][1],
          initial: initialDensity[i][1],
          passing: passingDensity[i][1],
          final: finalDensity[i][1],
        }))

        return { state, rows, stacked: stack().keys(LAYERS)(rows) }
      },
    )
  }, [totalBreakdown, scopedBreakdown, ticks, kde])

  const maxDensity =
    max(
      densities.flatMap(({ rows, stacked }) => [
        ...rows.map((r) => r.total),
        ...stacked.flatMap((layer) => layer.map((d) => d[1])),
      ]),
    ) || 1

  // Zero density sits at the row's top edge, growing downward within the
  // row's own height — the state with the single largest peak reaches a full
  // row's height, everything else scales down proportionally against that
  // same maxDensity.
  const bandwidth = y.bandwidth()
  const densityY = scaleLinear().domain([0, maxDensity]).range([0, -bandwidth])

  // The reference envelope — always the full distribution, drawn from `total`
  // directly rather than from the (possibly narrower) stack's own sum.
  const totalArea = area()
    .curve(curveStep)
    .x((d) => x(d.x))
    .y0(densityY(0))
    .y1((d) => densityY(d.total))

  const layerArea = area()
    .curve(curveStep)
    .x((d) => x(d.data.x))
    .y0((d) => densityY(d[0]))
    .y1((d) => densityY(d[1]))

  return (
    <g className={styles.density}>
      {densities.map(({ state, rows, stacked }) => (
        <motion.g
          key={`density-state-${state}`}
          className="density-state"
          initial={{ y: y(state) + marginTop }}
          animate={{ y: y(state) + marginTop }}
          transition={{ duration: 0.2 }}
        >
          <g>
            <PathGroup
              datum={rows}
              lineGenerator={totalArea}
              opacity={0.2}
              fillColor="var(--surface-accent)"
            />
            {hasClusterSelection &&
              stacked.map((layer) => (
                <PathGroup
                  key={`${state}-${layer.key}`}
                  datum={layer}
                  lineGenerator={layerArea}
                  opacity={hasClusterSelection ? LAYER_OPACITY[layer.key] : 0.5}
                  fillColor={hasClusterSelection ? LAYER_COLOR[layer.key] : "var(--surface-accent)"}
                />
              ))}
          </g>
        </motion.g>
      ))}
    </g>
  )
}

const PathGroup = ({ datum, lineGenerator, opacity = 1, fillColor }) => {
  return (
    <motion.path
      initial={{
        stroke: "white",
        strokeWidth: 0,
        strokeLinejoin: "round",
        d: lineGenerator(datum),
        strokeOpacity: opacity,
        fill: "none",
      }}
      animate={{
        d: lineGenerator(datum),
        strokeOpacity: opacity,
        fill: fillColor,
        // fill: "var(--surface-accent)",
        fillOpacity: opacity,
      }}
      exit={{
        strokeOpacity: 0,
        fillOpacity: 0,
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
