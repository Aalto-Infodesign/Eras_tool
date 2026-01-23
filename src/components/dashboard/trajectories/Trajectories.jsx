import { useEffect, useContext } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { select, selectAll } from "d3"

import "./Trajectories.css"

export const Trajectories = (props) => {
  const trajectoriesContext = useContext(TrajectoriesContext)
  const {
    marginTop,
    palette,
    dateRange,
    filters,
    scales,
    selectedTrajectoriesIDs,
    selectedLumps,
    toggleSelectedTrajectory,
    filteredLinks,
  } = trajectoriesContext
  const { showLinesOfSelectedLumps } = props
  const { isSelectModeLines } = props

  const { x, y } = scales

  useEffect(() => {
    const svgGroup = select("g#trajectories")

    // TODO: fix distance between switches

    svgGroup
      .selectAll(".switch")
      .data(
        (!isSelectModeLines &&
          selectedLumps.length > 0 &&
          showLinesOfSelectedLumps &&
          filteredLinks) ||
          (isSelectModeLines && filteredLinks),
        (d) => `switch-${d.id}-${d.lump}-${d.source.x}`
      )
      .join(
        (enter) =>
          enter
            .append("line")
            .classed("switch", true)
            .attr("id", (d) => `switch-line-${d.id}-${d.lump}-${d.source.x}`)
            .attr("x1", (d) => x(d.source.x))
            .attr("y1", (d) => y(d.source.state) + marginTop)
            .attr("x2", (d) => x(d.target.x))
            .attr("y2", (d) => y(d.target.state) + marginTop)
            .classed("selected", (d) => selectedTrajectoriesIDs.includes(d.id))
            .attr("stroke", (d) => palette[d.source.state])
            .attr("stroke-dasharray", (d) => {
              if (d.source.date >= dateRange[0]) return "0"
              else
                return dateRange[0] - d.source.date < (dateRange[0] - filters.date.extent[0]) / 2
                  ? "1.1 1.1"
                  : "0 0.75"
            })
            .attr("opacity", 0)
            // .attr("pathLength", 100)
            .attr("stroke-dasharray", (d) => {
              const length = Math.hypot(
                Math.abs(x(d.target.x) - x(d.source.x)),
                Math.abs(y(d.target.state) - y(d.source.state))
              )
              const startGap = 1
              const endGap = 1.2

              const totalGap = startGap + endGap
              const visibleLength = length - totalGap

              const offset = `${visibleLength} ${totalGap} `

              return offset
            })
            .attr("stroke-dashoffset", -1)
            // on click add the d.id to the selectedTrajectoriesIDs
            .call((line) => line.append("title").text((d) => `ID: ${d.id}`))

            .on("click", (e, d) => {
              console.log("clicked", d.id)
              toggleSelectedTrajectory(d.id)
            })

            .transition()
            .duration(200)
            .attr("opacity", 0.8),

        (update) => {
          update
            .attr("stroke-dasharray", (d) => {
              if (d.source.date >= dateRange[0]) {
                const length = Math.hypot(
                  Math.abs(x(d.target.x) - x(d.source.x)),
                  Math.abs(y(d.target.state) - y(d.source.state))
                )
                const startGap = 1
                const endGap = 1.2

                const totalGap = startGap + endGap
                const visibleLength = length - totalGap

                const offset = `${visibleLength} ${totalGap} `

                return offset
              } else {
                if (dateRange[0] - d.source.date < (dateRange[0] - filters.date.extent[0]) / 2)
                  return "1.1 1.1"
                else return " .75 1.5"
              }
            })
            .attr("stroke-dashoffset", (d) => {
              if (d.source.date >= dateRange[0]) return -1
              else return 0
            })
            .attr("id", (d) => `switch-line-${d.id}-${d.lump}`)
            .on("click", (e, d) => {
              // console.log("clicked", d.id)
              toggleSelectedTrajectory(d.id)
            })
            .classed("selected", (d) => selectedTrajectoriesIDs.includes(d.id))
            .transition()
            .duration(300)
            .attr("x1", (d) => x(d.source.x))
            .attr("y1", (d) => y(d.source.state) + marginTop)
            .attr("x2", (d) => x(d.target.x))
            .attr("y2", (d) => y(d.target.state) + marginTop)
            .attr("stroke", (d) =>
              selectedTrajectoriesIDs.length > 0
                ? selectedTrajectoriesIDs.includes(d.id)
                  ? `color-mix(in srgb,  ${palette[d.source.state]}, var(--surface-contrast) 0%)`
                  : `color-mix(in srgb,  ${palette[d.source.state]}, var(--surface-contrast) 40%)`
                : `color-mix(in srgb,  ${palette[d.source.state]}, var(--surface-contrast) 0%)`
            )
          // .attr("opacity", (d) => (selectedTrajectoriesIDs.includes(d.id) ? 1 : 1))
        },

        (exit) => exit.transition().duration(300).attr("opacity", 0).remove()
      )

    const highlightedTrajectories = filteredLinks.filter((d) =>
      selectedTrajectoriesIDs.includes(d.id)
    )
    // console.log("highlightedTrajectories", highlightedTrajectories)

    svgGroup
      .selectAll(".marker")
      .data(highlightedTrajectories, (d) => `marker-${d.id}-${d.lump}-${d.source.x}`)
      .join(
        (enter) => {
          const markerGroup = enter
            .append("g")
            .classed("marker", true)
            .attr("id", (d) => `marker-${d.id}-${d.lump}`)
            .attr("transform", (d) => {
              const xPos = x(d.source.x)
              const yPos = y(d.source.state) + marginTop
              return `translate(${xPos}, ${yPos})`
            })

          markerGroup
            .append("circle")
            .classed("marker-circle", true)
            .attr("fill", (d) => palette[d.source.state])
            .on("click", (e, d) => {
              console.log("clicked marker", d.source.x)
              toggleSelectedTrajectory(d.id)

              // Highlight all markers with the same id across different groups
              selectAll(`.marker-circle`)
                .filter((nodeData) => nodeData.id === d.id)
                .classed("highlighted", true)
            })
            .attr("r", 0)
            .on("mouseover", function (_e, d) {
              // Highlight all markers with the same id across different groups on hover
              selectAll(`.marker-circle`)
                .filter((nodeData) => nodeData.id === d.id)
                .classed("active", true)

              // Highlight corresponding marker-labels
              selectAll(`.marker-label`)
                .filter((nodeData) => nodeData.id === d.id)
                .classed("active", true)
            })
            .on("mouseout", function (_e, d) {
              // Remove highlight from all markers with the same id across different groups
              selectAll(`.marker-circle`)
                .filter((nodeData) => nodeData.id === d.id)
                .classed("active", false)

              // Remove highlight from corresponding marker-labels
              selectAll(`.marker-label`)
                .filter((nodeData) => nodeData.id === d.id)
                .classed("active", false)
            })
            .transition()
            .duration(300)
            .attr("r", 2)

          markerGroup
            .append("text")
            .text((d) => d.source.x.toFixed(0))
            .classed("marker-label", true)
            .attr("y", 1)

          return markerGroup
        },

        (update) => {
          update
            .transition()
            .duration(300)
            .attr("transform", (d) => {
              const xPos = x(d.source.x)
              const yPos = y(d.source.state) + marginTop
              return `translate(${xPos}, ${yPos})`
            })

          update
            .select("circle")
            .transition()
            .duration(300)
            .attr("fill", (d) => palette[d.source.state])
        },
        (exit) => {
          exit.select("circle").transition().duration(300).attr("r", 0).remove()

          exit.transition().duration(300).remove()
        }
      )

    const singleStateSwitches = filteredLinks.filter(
      (l) => l.source.state === l.target.state && l.initialState === true && l.finalState === true
    )

    // console.log("singleStateSwitches", singleStateSwitches)

    const rectDimensions = { width: 2, height: 4 }
    svgGroup
      .selectAll(".singleStateSwitch")
      .data(
        (!isSelectModeLines &&
          selectedLumps.length > 0 &&
          showLinesOfSelectedLumps &&
          singleStateSwitches) ||
          (isSelectModeLines && singleStateSwitches),
        (d) => `singleStateSwitch-${d.id}-${d.lump}-${d.source.x}`
      )
      .join(
        (enter) => {
          enter
            .append("rect")
            .classed("singleStateSwitch", true)
            .attr("id", (d) => `singleStateSwitch-${d.id}-${d.lump}-${d.source.x}`)
            .attr("x", (d) => x(d.source.x) - rectDimensions.width / 2)
            .attr("y", (d) => y(d.source.state) + marginTop - rectDimensions.height / 2)
            .attr("width", 0)
            .attr("height", 0)
            .attr("fill", (d) => palette[d.source.state])
            .call((rect) => rect.append("title").text((d) => `ID: ${d.id}`))
            .transition()
            .duration(300)
            .attr("width", rectDimensions.width)
            .attr("height", rectDimensions.height)
        },
        (update) => {
          update
            .transition()
            .duration(300)
            .attr("x", (d) => x(d.source.x) - rectDimensions.width / 2)
            .attr("y", (d) => y(d.source.state) + marginTop - rectDimensions.height / 2)
        },
        (exit) => {
          exit.transition().duration(300).attr("width", 0).attr("height", 0).remove()
        }
      )

    // DEBUG DOM Elements
    // console.log("dom elements:", document.getElementsByTagName("*").length)
    // console.log("durationsSvg elements:", document.getElementById("durationsSvg").childElementCount)
    // console.log("trajectories elements:", document.getElementById("trajectories").childElementCount)
    // console.log(
    //   "statesDistribution elements:",
    //   document.getElementById("statesDistribution").childElementCount
    // )
  }, [
    selectedLumps,
    showLinesOfSelectedLumps,
    filteredLinks,
    y,
    selectedTrajectoriesIDs,
    isSelectModeLines,
  ])

  return <g id="trajectories"></g>
}
