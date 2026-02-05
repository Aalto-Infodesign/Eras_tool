import { useEffect, useContext } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { select, scaleLinear, curveStep, mean, line } from "d3"
import { isNil } from "lodash"

import { useViz } from "../../../contexts/VizContext"

export function StateDensity(props) {
  const { palette } = useViz()
  const trajectoriesContext = useContext(TrajectoriesContext)
  const { marginTop, selectedSilhouettes, chartScales } = trajectoriesContext

  const { filteredLinks } = props
  // const { showStateDensity } = props
  const { x, y } = chartScales

  const { unitedObjectsOriginal, mergedObjectsByState } = props
  const { hoveredDistribution } = props

  // const filteredLinksBySourceState = groupBy(filteredLinks, "source.state")
  // const filteredLinksByTargetState = groupBy(filteredLinks, "target.state")
  // // TODO Merge these objects

  // //   console.log(linksBysourceState)

  // const filteredStatesAndItemsSource = values(
  //   mapValues(filteredLinksBySourceState, (stateItems, stateKey) => ({
  //     state: stateKey,
  //     items: stateItems,
  //   }))
  // )

  // const filteredStatesAndItemsTarget = values(
  //   mapValues(filteredLinksByTargetState, (stateItems, stateKey) => ({
  //     state: stateKey,
  //     items: stateItems,
  //   }))
  // )
  // console.log(statesAndItems)

  const densityYSource = scaleLinear().range([1, 0]).domain([0, 0.015])
  const densityYTarget = scaleLinear().range([0, 1]).domain([0, 0.015])
  // Compute kernel density estimation
  const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40))

  useEffect(() => {
    const densityGroup = select("g#density")
    densityGroup
      .selectAll(".density-state-source")
      .data(unitedObjectsOriginal, (d) => `density-state-source-${d.state}`)
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .classed("density-state-source", true)
            .attr("id", (d) => `state-density-group-${d.state}`)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

          group
            .append("path")
            .attr("class", "mypath")
            .attr("class", "animated")
            .datum((d) => d)
            .attr("fill", (d) => palette[d.state])
            .attr("opacity", (d) =>
              hoveredDistribution.state === d.state && hoveredDistribution.type === "IT"
                ? 0.8
                : 0.4,
            )
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("stroke-linejoin", "round")
            .datum((d) => kde(d.initialStateOG.map((d) => d.source.x)))
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYSource(d[1])),
            )
        },
        (update) => {
          update
            .transition()
            .duration(300)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

          // update.select("text").text((d) => y(d.state))
          update
            .select("path")
            .datum((d) => d)
            .attr(
              "opacity",
              (d) => (
                console.log(hoveredDistribution.state, d.state),
                hoveredDistribution.state === d.state && hoveredDistribution.type === "IT"
                  ? 0.8
                  : 0.4
              ),
            )
            .datum((d) =>
              kde(
                d.initialStateOG.map(function (d) {
                  return d.source.x
                }),
              ),
            )
            // .transition()
            // .duration(300)
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYSource(d[1])),
            )
        },

        (exit) => exit.remove(),
      )

    densityGroup
      .selectAll(".density-state-source-filtered")
      .data(
        selectedSilhouettes.length > 0 && mergedObjectsByState,
        (d) => `density-state-source-filtered-${d.state}`,
      )
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .classed("density-state-source-filtered", true)
            .attr("id", (d) => `state-density-group-${d.state}`)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

          group
            .append("path")
            .attr("class", "mypath")
            .attr("class", "animated")
            .datum((d) => d)
            .attr("fill", (d) => palette[d.state])
            .attr("opacity", 0.8)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("stroke-linejoin", "round")
            .datum((d) => {
              const data = !isNil(d.initialState) ? d.initialState : d.initialStateOG
              return kde(data.map((d) => d.source.x))
            })
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYSource(d[1])),
            )
        },
        (update) => {
          update
            .transition()
            .duration(300)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop - 1})`)

          // update.select("text").text((d) => y(d.state))
          update
            .select("path")
            .datum((d) => {
              const data = !isNil(d.initialState) ? d.initialState : d.initialStateOG
              return kde(data.map((d) => d.source.x))
            })
            // .transition()
            // .duration(300)
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYSource(d[1])),
            )
        },

        (exit) => exit.remove(),
      )

    densityGroup
      .selectAll(".density-state-target")
      .data(unitedObjectsOriginal, (d) => `density-state-target-${d.state}`)
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .classed("density-state-target", true)
            .attr("id", (d) => `state-density-group-${d.state}`)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

          group
            .append("path")
            .attr("class", "mypath")
            .attr("class", "animated")
            .datum((d) => d)
            .attr("fill", (d) => palette[d.state])
            .attr("opacity", () => (hoveredDistribution.type === "FT" ? 0.8 : 0.4))
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("stroke-linejoin", "round")
            .datum((d) => kde(d.finalStateOG.map((d) => d.target.x)))
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYTarget(d[1])),
            )
        },
        (update) => {
          update
            .transition()
            .duration(300)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

          // update.select("text").text((d) => y(d.state))
          update
            .select("path")
            .datum((d) => d)
            .attr(
              "opacity",
              (d) => (
                console.log(hoveredDistribution.state, d.state),
                hoveredDistribution.state === d.state && hoveredDistribution.type === "FT"
                  ? 0.8
                  : 0.4
              ),
            )
            .datum((d) =>
              kde(
                d.finalStateOG.map(function (d) {
                  return d.target.x
                }),
              ),
            )
            // .transition()
            // .duration(300)
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYTarget(d[1])),
            )
        },

        (exit) => exit.remove(),
      )

    densityGroup
      .selectAll(".density-state-target-filtered")
      .data(
        selectedSilhouettes.length > 0 && mergedObjectsByState,
        (d) => `density-state-target-filtered-${d.state}`,
      )
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .classed("density-state-target-filtered", true)
            .attr("id", (d) => `state-density-group-${d.state}`)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

          group
            .append("path")
            .attr("class", "mypath")
            .datum((d) => d)
            .attr("fill", (d) => palette[d.state])
            .attr("opacity", 0.8)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("stroke-linejoin", "round")
            .datum((d) => {
              const data = !isNil(d.finalState) ? d.finalState : d.finalStateOG
              return kde(data.map((d) => d.target.x))
            })
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYTarget(d[1])),
            )
        },
        (update) => {
          update
            .transition()
            .duration(300)
            .attr("transform", (d) => `translate(0,${y(d.state) + marginTop})`)

          // update.select("text").text((d) => y(d.state))
          update
            .select("path")
            .datum((d) => {
              const data = !isNil(d.finalState) ? d.finalState : d.finalStateOG
              return kde(data.map((d) => d.target.x))
            })
            // .transition()
            // .duration(300)
            .attr(
              "d",
              line()
                .curve(curveStep)
                .x((d) => x(d[0]))
                .y((d) => densityYTarget(d[1])),
            )
        },

        (exit) => exit.remove(),
      )
  })

  return <g id="density"></g>
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
