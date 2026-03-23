import { useContext, useEffect } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { select, scaleLinear, scaleRadial, extent } from "d3"
import { values, unionBy, flatten, isNil } from "lodash"
import { motion } from "motion/react"

import { useViz } from "../../../contexts/VizContext"
import { useFilters } from "../../../contexts/FiltersContext"

export function StateTypeDistribution(props) {
  const { palette } = useViz()
  const trajectoriesContext = useContext(TrajectoriesContext)
  const { selectedSilhouettesNames } = useFilters()
  const { h, marginTop, chartScales } = trajectoriesContext

  const { y } = chartScales

  const { setHoveredDistribution = () => {} } = props
  const {
    unitedObjectsOriginal,
    mergedObjectsByState,

    initialAndFinalCompletePerStateSource,
    initialAndFinalCompletePerStateTarget,
  } = props

  const offsetX = 35
  const colDistance = 12
  const linePadding = 5
  const cometlength = 10

  const labelData = [
    { text: "I", x: -colDistance + offsetX },
    { text: "F", x: colDistance + offsetX },
  ]
  const midPoint = labelData.reduce((a, c) => a + c.x, 0) / labelData.length
  const countedAllByState = flatten(
    values(
      unionBy(
        initialAndFinalCompletePerStateSource,
        initialAndFinalCompletePerStateTarget,
        "state",
      ).map((d) => [d.initialState.length, d.finalState.length]),
    ),
  )
  const statesExtent = extent(countedAllByState)
  const radius = scaleRadial(statesExtent, [0, 5])
  const distance = scaleLinear([0, statesExtent[1]], [1, cometlength])

  // useEffect(() => {
  //   const midPoint = labelData.reduce((a, c) => a + c.x, 0) / labelData.length
  //   const countedAllByState = flatten(
  //     values(
  //       unionBy(
  //         initialAndFinalCompletePerStateSource,
  //         initialAndFinalCompletePerStateTarget,
  //         "state",
  //       ).map((d) => [d.initialState.length, d.finalState.length]),
  //     ),
  //   )

  //   const statesExtent = extent(countedAllByState)
  //   const radius = scaleRadial(statesExtent, [0, 5])
  //   const distance = scaleLinear([0, statesExtent[1]], [1, cometlength])
  //   const distributionGroup = select("g#statesDistribution")

  //   distributionGroup
  //     .selectAll(".distribution-state")
  //     .data(
  //       selectedSilhouettesNames.length === 0 ? unitedObjectsOriginal : mergedObjectsByState,
  //       (d) => `distribution-state-${d.state}`,
  //     )
  //     .join(
  //       (enter) => {
  //         const group = enter
  //           .append("g")
  //           .classed("distribution-state", true)
  //           .classed("animated", true)
  //           .attr("id", (d) => `state-density-group-${d.state}`)
  //           .attr("transform", (d) => `translate(${offsetX},${y(d.state) + marginTop})`)

  //         const initalGroup = group
  //           .append("g")
  //           .classed("initial-group", true)
  //           .attr("id", (d) => `state-density-group-${d.state}-initial`)
  //           .attr("transform", (d) => `translate(-${colDistance},0)`)

  //         initalGroup
  //           .append("polygon")
  //           .classed("polygon-initial", true)
  //           .classed("animated", true)
  //           .attr("points", (d) => {
  //             const r1 = radius(d.initialStateOG.length)
  //             const r2 = isNil(d.initialState) ? 0 : radius(d.initialState.length)
  //             const difference = isNil(d.initialState)
  //               ? 10
  //               : d.initialStateOG.length - d.initialState.length
  //             const D = -distance(difference)
  //             return getTangentPoints(r1, r2, D)
  //           })
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("opacity", 0.6)

  //         initalGroup
  //           .append("circle")
  //           .attr("id", (d) => `circle-${d.state}`)
  //           .classed("circle-i", true)
  //           .classed("distribution-circle", true)
  //           .classed("animated", true)
  //           .attr("r", (d) => radius(d.initialStateOG.length))
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("fill-opacity", 1)
  //           .attr("stroke-width", 0.5)
  //           // .attr("stroke-opacity", 0.8)
  //           .attr("stroke", (d) => "var(--bg)")
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "IT",
  //               text: "Total: " + d.initialStateOG.length,
  //               state: d.state,
  //             }),
  //           )
  //           .on("mouseleave", (_e) => setHoveredDistribution({ type: "", text: "", state: "" }))

  //         initalGroup
  //           .append("circle")
  //           .attr("id", (d) => `circle-initial-${d.state}`)
  //           .classed("circle-initial", true)
  //           .classed("distribution-circle", true)
  //           .classed("animated", true)
  //           .attr("cx", (d) => {
  //             const difference = isNil(d.initialState)
  //               ? 10
  //               : d.initialStateOG.length - d.initialState.length
  //             return -distance(difference)
  //           })
  //           .attr("r", (d) => (isNil(d.initialState) ? 0 : radius(d.initialState.length)))
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("fill-opacity", 1)
  //           .attr("stroke-width", 0.5)
  //           // .attr("stroke", (d) => palette[d.state])
  //           .attr("stroke", (d) => "var(--bg)")
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "IS",
  //               text: "Selected: " + d.initialState.length,
  //               state: d.state,
  //             }),
  //           )
  //           .on("mouseleave", (_e) => setHoveredDistribution({ type: "", text: "", state: "" }))

  //         const finalGroup = group
  //           .append("g")
  //           .classed("final-group", true)
  //           .attr("id", (d) => `state-density-group-${d.state}-final`)
  //           .attr("transform", (d) => `translate(${colDistance},0)`)
  //         // .attr("opacity", 0.5)

  //         finalGroup
  //           .append("polygon")
  //           .classed("polygon-final", true)
  //           .classed("animated", true)
  //           .attr("points", (d) => {
  //             const r1 = radius(d.finalStateOG.length)
  //             const r2 = isNil(d.finalState) ? 0 : radius(d.finalState.length)
  //             const difference = isNil(d.finalState)
  //               ? 10
  //               : d.finalStateOG.length - d.finalState.length
  //             const D = -distance(difference)
  //             return getTangentPoints(r1, r2, D)
  //           })
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("opacity", 0.6)

  //         finalGroup
  //           .append("circle")
  //           .attr("id", (d) => `circle-f-${d.state}`)
  //           .classed("circle-f", true)
  //           .classed("distribution-circle", true)
  //           .classed("animated", true)
  //           .attr("r", (d) => radius(d.finalStateOG.length))
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("stroke-width", 0.5)
  //           .attr("stroke", (d) => "var(--bg)")
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "FT",
  //               text: "Total: " + d.finalStateOG.length,
  //               state: d.state,
  //             }),
  //           )
  //           .on("mouseleave", (_e) => setHoveredDistribution({ type: "", text: "", state: "" }))

  //         finalGroup
  //           .append("circle")
  //           .attr("id", (d) => `circle-final-${d.state}`)
  //           .classed("circle-final", true)
  //           .classed("distribution-circle", true)
  //           .classed("animated", true)
  //           .attr("cx", (d) => {
  //             const difference = isNil(d.finalState)
  //               ? 10
  //               : d.finalStateOG.length - d.finalState.length
  //             return -distance(difference)
  //           })
  //           .attr("r", (d) => (isNil(d.finalState) ? 0 : radius(d.finalState.length)))
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("stroke-width", 0.5)
  //           .attr("stroke", (d) => "var(--bg)")
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "FS",
  //               text: "Selected: " + d.finalState.length,
  //               state: d.state,
  //             }),
  //           )
  //           .on("mouseleave", (_e) => setHoveredDistribution({ type: "", text: "", state: "" }))
  //       },

  //       (update) => {
  //         update
  //           .attr("id", (d) => `state-density-group-${d.state}`)
  //           .attr("transform", (d) => `translate(${offsetX},${y(d.state) + marginTop})`)

  //         update
  //           .select(".circle-i")
  //           .attr("id", (d) => `circle-${d.state}`)
  //           .attr("r", (d) => radius(d.initialStateOG.length))
  //           .attr("fill", (d) => palette[d.state])
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "IT",
  //               text: "Total: " + d.initialStateOG.length,
  //               state: d.state,
  //             }),
  //           )

  //         update
  //           .select(".circle-initial")
  //           .attr("id", (d) => `circle-initial-${d.state}`)
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("r", (d) => (isNil(d.initialState) ? 0 : radius(d.initialState.length)))
  //           .attr("cx", (d) => {
  //             const difference = isNil(d.initialState)
  //               ? 10
  //               : d.initialStateOG.length - d.initialState.length
  //             return -distance(difference)
  //           })
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "IS",
  //               text: "Selected: " + d.initialState.length,
  //               state: d.state,
  //             }),
  //           )

  //         // update.select(".circle-i").transition().duration(300)

  //         update
  //           .select(".polygon-initial")
  //           .transition()
  //           .duration(300)
  //           .attr("points", (d) => {
  //             const r1 = radius(d.initialStateOG.length)
  //             const r2 = isNil(d.initialState) ? 0 : radius(d.initialState.length)
  //             const difference = isNil(d.initialState)
  //               ? 10
  //               : d.initialStateOG.length - d.initialState.length
  //             const D = -distance(difference)
  //             return getTangentPoints(r1, r2, D)
  //           })
  //           .attr("fill", (d) => palette[d.state])

  //         update
  //           .select(".polygon-final")
  //           .transition()
  //           .duration(300)
  //           .attr("points", (d) => {
  //             const r1 = radius(d.finalStateOG.length)
  //             const r2 = isNil(d.finalState) ? 0 : radius(d.finalState.length)
  //             const difference = isNil(d.finalState)
  //               ? 10
  //               : d.finalStateOG.length - d.finalState.length
  //             const D = -distance(difference)
  //             return getTangentPoints(r1, r2, D)
  //           })
  //           .attr("fill", (d) => palette[d.state])

  //         update
  //           .select(".circle-f")
  //           .attr("id", (d) => `circle-f-${d.state}`)
  //           .attr("r", (d) => radius(d.finalStateOG.length))
  //           .attr("fill", (d) => palette[d.state])
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "FT",
  //               text: "Total: " + d.finalStateOG.length,
  //               state: d.state,
  //             }),
  //           )

  //         update
  //           .attr("id", (d) => `circle-final-${d.state}`)
  //           .select(".circle-final")
  //           .attr("fill", (d) => palette[d.state])
  //           .attr("r", (d) => (isNil(d.finalState) ? 0 : radius(d.finalState.length)))
  //           .attr("cx", (d) => {
  //             const difference = isNil(d.finalState)
  //               ? 10
  //               : d.finalStateOG.length - d.finalState.length
  //             return -distance(difference)
  //           })
  //           .on("mouseover", (_e, d) =>
  //             setHoveredDistribution({
  //               type: "FS",
  //               text: "Selected: " + d.finalState.length,
  //               state: d.state,
  //             }),
  //           )
  //       },
  //       (exit) => {
  //         exit.select(".circle-initial").attr("r", 0).attr("opacity", 0)
  //         exit.select(".circle-final").attr("r", 0).attr("opacity", 0)

  //         exit.remove()
  //       },
  //     )
  // }, [y, selectedSilhouettesNames, palette, unitedObjectsOriginal, mergedObjectsByState])
  return (
    <g id="statesDistribution">
      <g id="grid">
        {labelData && (
          <g id="header">
            {labelData.map((d) => (
              <text
                key={`label-${d.text}`}
                className="distribution-label"
                x={d.x}
                y={5}
                fontSize={4}
                fill="var(--text-primary)"
              >
                {d.text}
              </text>
            ))}
          </g>
        )}
        <line
          className="split-line"
          x1={midPoint}
          x2={midPoint}
          y1={linePadding}
          y2={h}
          stroke="var(--text-primary)"
          strokeWidth={0.2}
        />
      </g>

      <g id="distributions">
        {mergedObjectsByState.map((d) => {
          return (
            <>
              <CircleGroup
                type="initial"
                name={d.state}
                state={d.initialState}
                stateOriginal={d.initialStateOG}
                radius={radius}
                distance={distance}
                y={y}
                offsetX={offsetX}
                palette={palette}
                marginTop={marginTop}
                colDistance={-colDistance}
                setHoveredDistribution={setHoveredDistribution}
              />
              <CircleGroup
                type="final"
                name={d.state}
                state={d.finalState}
                stateOriginal={d.finalStateOG}
                radius={radius}
                distance={distance}
                y={y}
                offsetX={offsetX}
                palette={palette}
                marginTop={marginTop}
                colDistance={colDistance}
                setHoveredDistribution={setHoveredDistribution}
              />
            </>
          )
        })}
      </g>
    </g>
  )
}

const CircleGroup = ({
  type,
  name,
  state,
  stateOriginal,
  radius,
  distance,
  y,
  offsetX,
  palette,
  marginTop,
  colDistance,
  setHoveredDistribution,
}) => {
  const r1 = radius(stateOriginal.length)
  const r2 = isNil(state) ? 0 : radius(state.length)
  const difference = isNil(state) ? 10 : stateOriginal.length - state.length
  const D = -distance(difference)
  const points = getTangentPoints(r1, r2, D)
  return (
    <motion.g
      key={`states-density-${name}-${type}`}
      id={`states-density-${name}`}
      className="distribution-state"
      initial={{ y: y(name) + marginTop, x: offsetX }}
      animate={{ y: y(name) + marginTop, x: offsetX }}
    >
      <motion.g id={`initial-${name}`} initial={{ x: colDistance }} animate={{ x: colDistance }}>
        <polygon className="polygon-initial" points={points} fill={palette[name]} opacity={0.6} />
        <circle
          id={`circle-${name}`}
          className="circle-i distribution-circle"
          r={r1}
          fill={palette[name]}
          strokeWidth={0.5}
          onMouseOver={() =>
            setHoveredDistribution({
              type: "IT",
              text: "Total: " + stateOriginal.length,
              state: name,
            })
          }
          onMouseLeave={() =>
            setHoveredDistribution({
              type: "",
              text: "",
              state: "",
            })
          }
        />
        <circle
          id={`circle-initial-${name}`}
          className="circle-initial distribution-circle"
          cx={D}
          r={r2}
          fill={palette[name]}
          strokeWidth={0.5}
          onMouseOver={() =>
            setHoveredDistribution({
              type: "IS",
              text: "Selected: " + state.length,
              state: name,
            })
          }
          onMouseLeave={() =>
            setHoveredDistribution({
              type: "",
              text: "",
              state: "",
            })
          }
        />
      </motion.g>
    </motion.g>
  )
}

// function getInitialAndFinalPerState(linksByState) {
//   return sortBy(
//     values(
//       mapValues(linksByState, (stateItems, stateKey) => ({
//         state: stateKey,
//         initialState: stateItems.filter((d) => d.initialState && d),
//         finalState: stateItems.filter((d) => d.finalState && d),
//       }))
//     ),
//     "state"
//   )
// }
// function getInitialAndFinalOGPerState(linksByState) {
//   return sortBy(
//     values(
//       mapValues(linksByState, (stateItems, stateKey) => ({
//         state: stateKey,
//         initialStateOG: stateItems.filter((d) => d.initialState && d),
//         finalStateOG: stateItems.filter((d) => d.finalState && d),
//       }))
//     ),
//     "state"
//   )
// }

function getTangentPoints(r2, r1, d) {
  if (r1 === 0) return "0,0 0,0 0,0 0,0"
  return `${d},-${r1} 0,-${r2} 0,${r2} ${d},${r1} `
}
