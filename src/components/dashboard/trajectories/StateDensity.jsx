import { useEffect, useContext } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { select, scaleLinear, curveStep, mean, line } from "d3"
import { isNil } from "lodash"

import { useViz } from "../../../contexts/VizContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useLinksAnalytics } from "../../hooks/useLinksAnalytics"

import { motion } from "motion/react"

export function StateDensity(props) {
  const { selectedSilhouettesNames } = useFilters()
  const { completeLinks, filteredLinks } = useDerivedData()

  const trajectoriesContext = useContext(TrajectoriesContext)
  const { marginTop, chartScales } = trajectoriesContext

  const { x, y } = chartScales

  const { hoveredDistribution } = props

  const completeLinksAnalytics = useLinksAnalytics(completeLinks)
  const filteredLinksAnalytics = useLinksAnalytics(filteredLinks)

  const linksAnalytics = completeLinksAnalytics.map((item) => {
    const match = filteredLinksAnalytics.find((f) => f.state === item.state)
    return {
      state: item.state,
      complete: { initial: item.initialTrajectories, final: item.finalTrajectories },
      filtered: {
        initial: match?.initialTrajectories ?? [],
        final: match?.finalTrajectories ?? [],
      },
    }
  })

  const densityYSource = scaleLinear().range([1, 0]).domain([0, 0.015])
  const densityYTarget = scaleLinear().range([0, 1]).domain([0, 0.015])
  // Compute kernel density estimation
  const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40))

  // useEffect(() => {
  //   const densityGroup = select("g#density")
  //   densityGroup
  //     .selectAll(".density-state-source")
  //     .data(linksAnalytics.complete, (d) => `density-state-source-${d.state}`)
  //     .join(
  //       (enter) => {
  //         const group = enter
  //           .append("g")
  //           .classed("density-state-source", true)
  //           .attr("id", (d) => `state-density-group-${d.state}`)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

  //         group
  //           .append("path")
  //           .attr("class", "mypath")
  //           .attr("class", "animated")
  //           .datum((d) => d)
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("opacity", (d) =>
  //             hoveredDistribution.state === d.state && hoveredDistribution.type === "IT"
  //               ? 0.8
  //               : 0.4,
  //           )
  //           .attr("stroke", "#fff")
  //           .attr("stroke-width", 0.5)
  //           .attr("stroke-linejoin", "round")
  //           .datum((d) => kde(d.initialStateOG.map((d) => d.source.x)))
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYSource(d[1])),
  //           )
  //       },
  //       (update) => {
  //         update
  //           .transition()
  //           .duration(300)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

  //         // update.select("text").text((d) => y(d.state))
  //         update
  //           .select("path")
  //           .datum((d) => d)
  //           .attr(
  //             "opacity",
  //             (d) => (
  //               console.log(hoveredDistribution.state, d.state),
  //               hoveredDistribution.state === d.state && hoveredDistribution.type === "IT"
  //                 ? 0.8
  //                 : 0.4
  //             ),
  //           )
  //           .datum((d) =>
  //             kde(
  //               d.initialStateOG.map(function (d) {
  //                 return d.source.x
  //               }),
  //             ),
  //           )
  //           // .transition()
  //           // .duration(300)
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYSource(d[1])),
  //           )
  //       },

  //       (exit) => exit.remove(),
  //     )

  //   densityGroup
  //     .selectAll(".density-state-source-filtered")
  //     .data(
  //       selectedSilhouettesNames.length > 0 && linksAnalytics.filtered,
  //       (d) => `density-state-source-filtered-${d.state}`,
  //     )
  //     .join(
  //       (enter) => {
  //         const group = enter
  //           .append("g")
  //           .classed("density-state-source-filtered", true)
  //           .attr("id", (d) => `state-density-group-${d.state}`)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

  //         group
  //           .append("path")
  //           .attr("class", "mypath")
  //           .attr("class", "animated")
  //           .datum((d) => d)
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("opacity", 0.8)
  //           .attr("stroke", "#fff")
  //           .attr("stroke-width", 0.5)
  //           .attr("stroke-linejoin", "round")
  //           .datum((d) => {
  //             const data = !isNil(d.initialState) ? d.initialState : d.initialStateOG
  //             return kde(data.map((d) => d.source.x))
  //           })
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYSource(d[1])),
  //           )
  //       },
  //       (update) => {
  //         update
  //           .transition()
  //           .duration(300)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

  //         // update.select("text").text((d) => y(d.state))
  //         update
  //           .select("path")
  //           .datum((d) => {
  //             const data = !isNil(d.initialState) ? d.initialState : d.initialStateOG
  //             return kde(data.map((d) => d.source.x))
  //           })
  //           // .transition()
  //           // .duration(300)
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYSource(d[1])),
  //           )
  //       },

  //       (exit) => exit.remove(),
  //     )

  //   densityGroup
  //     .selectAll(".density-state-target")
  //     .data(linksAnalytics.complete, (d) => `density-state-target-${d.state}`)
  //     .join(
  //       (enter) => {
  //         const group = enter
  //           .append("g")
  //           .classed("density-state-target", true)
  //           .attr("id", (d) => `state-density-group-${d.state}`)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

  //         group
  //           .append("path")
  //           .attr("class", "mypath")
  //           .attr("class", "animated")
  //           .datum((d) => d)
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("opacity", () => (hoveredDistribution.type === "FT" ? 0.8 : 0.4))
  //           .attr("stroke", "#fff")
  //           .attr("stroke-width", 0.5)
  //           .attr("stroke-linejoin", "round")
  //           .datum((d) => kde(d.finalStateOG.map((d) => d.target.x)))
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYTarget(d[1])),
  //           )
  //       },
  //       (update) => {
  //         update
  //           .transition()
  //           .duration(300)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

  //         // update.select("text").text((d) => y(d.state))
  //         update
  //           .select("path")
  //           .datum((d) => d)
  //           .attr(
  //             "opacity",
  //             (d) => (
  //               console.log(hoveredDistribution.state, d.state),
  //               hoveredDistribution.state === d.state && hoveredDistribution.type === "FT"
  //                 ? 0.8
  //                 : 0.4
  //             ),
  //           )
  //           .datum((d) =>
  //             kde(
  //               d.finalStateOG.map(function (d) {
  //                 return d.target.x
  //               }),
  //             ),
  //           )
  //           // .transition()
  //           // .duration(300)
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYTarget(d[1])),
  //           )
  //       },

  //       (exit) => exit.remove(),
  //     )

  //   densityGroup
  //     .selectAll(".density-state-target-filtered")
  //     .data(
  //       selectedSilhouettesNames.length > 0 && linksAnalytics.filtered,
  //       (d) => `density-state-target-filtered-${d.state}`,
  //     )
  //     .join(
  //       (enter) => {
  //         const group = enter
  //           .append("g")
  //           .classed("density-state-target-filtered", true)
  //           .attr("id", (d) => `state-density-group-${d.state}`)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

  //         group
  //           .append("path")
  //           .attr("class", "mypath")
  //           .datum((d) => d)
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("opacity", 0.8)
  //           .attr("stroke", "#fff")
  //           .attr("stroke-width", 0.5)
  //           .attr("stroke-linejoin", "round")
  //           .datum((d) => {
  //             const data = !isNil(d.finalState) ? d.finalState : d.finalStateOG
  //             return kde(data.map((d) => d.target.x))
  //           })
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYTarget(d[1])),
  //           )
  //       },
  //       (update) => {
  //         update
  //           .transition()
  //           .duration(300)
  //           .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

  //         // update.select("text").text((d) => y(d.state))
  //         update
  //           .select("path")
  //           .datum((d) => {
  //             const data = !isNil(d.finalState) ? d.finalState : d.finalStateOG
  //             return kde(data.map((d) => d.target.x))
  //           })
  //           // .transition()
  //           // .duration(300)
  //           .attr(
  //             "d",
  //             line()
  //               .curve(curveStep)
  //               .x((d) => x(d[0]))
  //               .y((d) => densityYTarget(d[1])),
  //           )
  //       },

  //       (exit) => exit.remove(),
  //     )
  // })

  return (
    <g id="density">
      {linksAnalytics.map((d) => {
        const path = line()
          .curve(curveStep)
          .x((d) => x(d[0]))
          .y((d) => densityYSource(d[1]))
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
              lineGenerator={path}
              kde={kde}
            />
            {/* <PathGroup
              name={d.state}
              trajectories={d.complete.final}
              lineGenerator={path}
              kde={kde}
            /> */}
            <PathGroup
              name={d.state}
              trajectories={d.filtered.initial}
              lineGenerator={path}
              kde={kde}
            />
            {/* <PathGroup
              name={d.state}
              trajectories={d.filtered.final}
              lineGenerator={path}
              kde={kde}
            /> */}
          </motion.g>
        )
      })}
    </g>
  )
}

const PathGroup = ({ name, trajectories, lineGenerator, kde }) => {
  const { palette } = useViz()

  const datum = kde(trajectories.map((d) => d.source.x))

  return (
    <motion.path
      initial={{
        stroke: "white",
        strokeWidth: 0.5,
        strokeLinejoin: "round",
        d: lineGenerator(datum),
        fillOpacity: 0.5,
        fill: "none",
      }}
      // fill={palette[name]}
      animate={{
        d: lineGenerator(datum),
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
