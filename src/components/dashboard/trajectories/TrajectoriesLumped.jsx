import { useEffect, useRef, useContext } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { select } from "d3"
import { includes, flattenDeep, values, map, isNil } from "lodash"
import {
  getMinMaxStateFromTrajectories,
  getMinMaxFromTrajectoriesBetwenTwoStates,
} from "../../../utils/getMinMax"

import textures from "textures"

import "./Lumps.css"

export const TrajectoriesLumped = (props) => {
  const trajectoriesContext = useContext(TrajectoriesContext)
  const {
    marginTop,
    palette,
    scales,
    startDate,
    analytics,
    durationRange,
    selectedLumps,
    toggleSelectedLumps,
  } = trajectoriesContext

  const { ageRange, dateRange, quantilesNumber, stayLenQuants } = analytics
  const { filteredSilhouettes } = props

  const { hoveredLump, setHoveredLump = () => {} } = props

  const { isSelectModeLines } = props
  const { x, y } = scales

  // Create refs to store texture instances
  const texturePastRef = useRef(null)
  const textureRemoteRef = useRef(null)

  const lumpPadding = 2
  const lumpOffsetX = 2

  useEffect(() => {
    const lumpsGroup = select("g#lumps")
    const svg = select("svg")

    // Initialize textures properly once
    if (!texturePastRef.current) {
      texturePastRef.current = textures
        .lines()
        .orientation("2/8")
        .size(3)
        .strokeWidth(0.3)
        .stroke("white")
      svg.call(texturePastRef.current)
    }

    if (!textureRemoteRef.current) {
      textureRemoteRef.current = textures.circles().size(3.5).radius(0.3).complement().fill("white")
      // textureRemoteRef.current = textures
      //   .lines()

      //   .orientation("6/8")
      //   .size(2)
      //   .strokeWidth(0.3)
      //   .stroke("white")
      svg.call(textureRemoteRef.current)
    }

    const filteredTrajectories = values(flattenDeep(filteredSilhouettes.map((s) => s.trajectories)))
      .map((t) => ({
        ...t,
        diseaseDuration: isNil(t.diseaseDuration) ? 0 : t.diseaseDuration,
      }))
      .filter((d) => d.diseaseDuration >= durationRange[0] && d.diseaseDuration < durationRange[1])

    const globalLumpData = getMinMaxStateFromTrajectories(filteredTrajectories)

    // console.log("globalLumpData", globalLumpData)

    const minDate = dateRange[0]
    const midpointDate = (minDate + startDate) / 2

    const presentTrajectories = filteredTrajectories.filter((d) => d.source.date >= startDate)
    const pastTrajectories = filteredTrajectories.filter(
      (d) => d.source.date < startDate && d.source.date >= midpointDate
    )
    const remoteTrajectories = filteredTrajectories.filter((d) => d.source.date < midpointDate)

    // Invert padding quando il y(target) è più grande di y(source)
    function createPolygonFromLump(data) {
      const defaultHeight = 3

      //if data.source.state === data.target.state skip the y calculation and use the default height
      const sourceY = y(data.source.state) + marginTop
      const targetY = y(data.target.state) + marginTop

      // const sourceY = y(data.source.state) + marginTop
      // const targetY = y(data.target.state) + marginTop
      const sourcePadding = targetY > sourceY ? lumpPadding : -lumpPadding
      const targetPadding = targetY > sourceY ? -lumpPadding : lumpPadding

      const offsetX = targetY > sourceY ? -lumpOffsetX : lumpOffsetX
      // const targetOffsetX = targetY > sourceY ? lumpOffsetX : -lumpOffsetX

      return `${x(data.source.x[0]) - offsetX},${sourceY + sourcePadding} ${
        x(data.source.x[1]) - offsetX
      },${sourceY + sourcePadding} ${x(data.target.x[1]) + offsetX},${targetY + targetPadding} ${
        x(data.target.x[0]) + offsetX
      },${targetY + targetPadding}`
    }

    function createOriginPolygonFromLump(data) {
      const sourceY = y(data.source.state) + marginTop
      const targetY = y(data.target.state) + marginTop
      const sourcePadding = targetY > sourceY ? lumpPadding : -lumpPadding
      const targetPadding = targetY > sourceY ? -lumpPadding : lumpPadding

      const offsetX = targetY > sourceY ? -lumpOffsetX : lumpOffsetX
      // const offsetX = -lumpOffsetX
      // const targetOffsetX = targetY > sourceY ? lumpOffsetX : -lumpOffsetX

      return `${x(data.source.x[0]) - offsetX},${sourceY + sourcePadding} ${
        x(data.source.x[0]) - offsetX
      },${sourceY + sourcePadding} ${x(data.target.x[0]) + offsetX},${targetY + targetPadding} ${
        x(data.target.x[0]) + offsetX
      },${targetY + targetPadding}`
    }

    // Process present data with filtering
    const presentLumps = getMinMaxFromTrajectoriesBetwenTwoStates(presentTrajectories).filter(
      (d) => d.items.length > 1
    )
    console.log("presentLumps", presentLumps)

    // Process past data with the same filtering logic as present
    const pastLumps = getMinMaxFromTrajectoriesBetwenTwoStates(pastTrajectories).filter(
      (d) => d.items.length > 1
    )

    // Process remote data with the same filtering logic as present
    const remoteLumps = getMinMaxFromTrajectoriesBetwenTwoStates(remoteTrajectories).filter(
      (d) => d.items.length > 1
    )

    !isNil(presentLumps) &&
      lumpsGroup
        .selectAll(".lump-group")
        .data(!isSelectModeLines && presentLumps, (d) => `lump-group-${d.type}`)
        .join(
          // Enter selection - new polygons fade in
          (enter) => {
            const groups = enter
              .append("g")
              .attr("class", "lump-group")
              .attr("id", (d) => `lump-group-${d.type}`)
            groups
              .append("polygon")
              .classed("lump", true)
              .classed("animated", true)
              .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
              .attr("id", (d) => `lump-${d.type}`)
              .attr("fill", (d) =>
                d.source.state === d.target.state
                  ? palette[d.source.state]
                  : `url(#gradient-${d.source.state}-${d.target.state})`
              )
              .attr("opacity", 0.3)
              .attr("points", (d) => createOriginPolygonFromLump(d))
              .transition()
              .duration(300)
              .attr("points", (d) => createPolygonFromLump(d))

            return groups
          },

          // Update selection - existing polygons smoothly transition
          (update) => {
            update
              .select("polygon")
              .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
              .attr("id", (d) => `lump-${d.type}`)

              .transition()
              .duration(300)
              .attr("points", (d) => createPolygonFromLump(d))
              .attr("fill", (d) =>
                d.source.state === d.target.state
                  ? palette[d.source.state]
                  : `url(#gradient-${d.source.state}-${d.target.state})`
              )

            return update
          },
          // Exit selection - removing polygons fade out
          (exit) => {
            exit
              .select("polygon")
              .transition()
              .duration(100)
              .attr("opacity", 0)
              .attr("points", (d) => createOriginPolygonFromLump(d))

            exit.transition().delay(50).remove()
          }
        )
        .on("click", function (_event, d) {
          toggleSelectedLumps(d)
        })
        .on("mouseenter", function (_event, d) {
          setHoveredLump(d)
        })
        .on("mouseleave", function () {
          setHoveredLump()
        })

    const lumpLinesExtreme = getMinMaxFromTrajectoriesBetwenTwoStates(presentTrajectories).filter(
      (d) => d.items.length === 1
    )

    lumpsGroup
      .selectAll(".lump-line-extreme")
      .data(!isSelectModeLines && lumpLinesExtreme, (d) => `lump-line-extreme-${d.type}`)
      .join(
        (enter) =>
          enter
            .append("line")
            .classed("lump-line-extreme", true)
            .classed("animated", true)
            .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
            .classed("hovered", (d) => !isNil(hoveredLump) && hoveredLump.type === d.type)
            .attr("id", (d) => `lump-line-${d.type}`)
            .attr("x1", (d) => x(d.source.x[0]))
            .attr("y1", (d) => y(d.source.state) + marginTop)
            .attr("x2", (d) => x(d.target.x[0]))
            .attr("y2", (d) => y(d.target.state) + marginTop)
            .attr("stroke", (d) => `url(#gradient-${d.source.state}-${d.target.state})`)
            .attr("stroke-width", 2)
            .attr("opacity", 0)
            .transition()
            .duration(300)
            .attr("opacity", 0.3),

        (update) =>
          update
            .attr("id", (d) => `lump-line-${d.type}`)
            .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
            .classed("hovered", (d) => !isNil(hoveredLump) && hoveredLump.type === d.type)
            .transition()
            .duration(300)
            .attr("x1", (d) => x(d.source.x[0]))
            .attr("y1", (d) => y(d.source.state) + marginTop)
            .attr("x2", (d) => x(d.target.x[0]))
            .attr("y2", (d) => y(d.target.state) + marginTop)
            .attr("stroke", (d) => `url(#gradient-${d.source.state}-${d.target.state})`),

        (exit) => {
          exit.transition().duration(100).attr("opacity", 0).remove()
        }
      )
      .on("click", function (_event, d) {
        toggleSelectedLumps(d)
      })
      .on("mouseenter", function (_event, d) {
        select(this).classed("hovered", true)
        setHoveredLump(d)
      })
      .on("mouseleave", function () {
        select(this).classed("hovered", false)
        setHoveredLump()
      })

    // Past lumps rendering with improved handling
    !isNil(pastLumps) &&
      lumpsGroup
        .selectAll(".lump-past")
        .data(!isSelectModeLines && pastLumps, (d) => `lump-past-${d.type}`)
        .join(
          (enter) =>
            enter
              .append("polygon")
              .attr("id", (d) => `lump-past-${d.type}`)
              .classed("lump-past", true)
              .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
              .attr("fill", texturePastRef.current.url())
              .attr("opacity", 0.3)
              .attr("points", (d) => createOriginPolygonFromLump(d))
              .transition()
              .duration(300)
              .attr("points", (d) => createPolygonFromLump(d)),

          // Update selection - existing polygons smoothly transition
          (update) =>
            update
              .attr("id", (d) => `lump-past-${d.type}`)
              .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
              .transition()
              .duration(300)
              .attr("points", (d) => createPolygonFromLump(d))
              .attr("fill", texturePastRef.current.url())
              .attr("opacity", 0.3),

          // Exit selection - removing polygons fade out
          (exit) =>
            exit
              .transition()
              .duration(300)
              .attr("opacity", 0)
              .attr("points", (d) => createOriginPolygonFromLump(d))
              .remove()
        )
        .on("click", function (_event, d) {
          toggleSelectedLumps(d)
        })
        .on("mouseenter", function (_event, d) {
          setHoveredLump(d)
        })
        .on("mouseleave", function () {
          setHoveredLump()
        })

    // Remote lumps rendering with improved handling
    !isNil(remoteLumps) &&
      lumpsGroup
        .selectAll(".lump-remote")
        .data(!isSelectModeLines && remoteLumps, (d) => `lump-remote-${d.type}`)
        .join(
          (enter) =>
            enter
              .append("polygon")
              .attr("id", (d) => `lump-remote-${d.type}`)
              .classed("lump-remote", true)
              .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
              .attr("fill", textureRemoteRef.current.url())
              .attr("opacity", 0.3)
              .attr("points", (d) => createOriginPolygonFromLump(d))
              .transition()
              .duration(300)
              .attr("points", (d) => createPolygonFromLump(d)),

          // Update selection - existing polygons smoothly transition
          (update) =>
            update
              .attr("id", (d) => `lump-remote-${d.type}`)
              .classed("selected", (d) => includes(map(selectedLumps, "type"), d.type))
              .transition()
              .duration(300)
              .attr("points", (d) => createPolygonFromLump(d))
              .attr("fill", textureRemoteRef.current.url())
              .attr("opacity", 0.3),

          // Exit selection - removing polygons fade out
          (exit) =>
            exit
              .transition()
              .duration(300)
              .attr("opacity", 0)
              .attr("points", (d) => createOriginPolygonFromLump(d))
              .remove()
        )
        .on("click", function (_event, d) {
          toggleSelectedLumps(d)
        })
        .on("mouseenter", function (_event, d) {
          setHoveredLump(d)
        })
        .on("mouseleave", function () {
          setHoveredLump()
        })

    const medianRect = {
      width: 1,
      height: 1.6,
    }

    lumpsGroup
      .selectAll(".lump-line-group")
      .data(globalLumpData, (d) => `$lump-line-group-${d.state}`)
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .attr("class", "lump-line-group")
            .attr("id", (d) => `$lump-line-group-${d.state}`)

          group
            .append("line")
            .classed("lump-line", true)
            .attr("id", (d) => `lump-line-${d.state}`)
            .attr("x1", (d) => x(d.x[0]))
            .attr("y1", (d) => y(d.state) + marginTop)
            .attr("x2", (d) => x(d.x[1]))
            .attr("y2", (d) => y(d.state) + marginTop)
            .attr("stroke-width", "1.5px")
            .attr("stroke-linecap", "round")
            .attr("stroke", (d) => palette[d.state])

          group
            .append("text")
            .classed("lump-label-start", true)
            .attr("id", (d) => `lump-label-start-${d.state}`)
            .attr("x", (d) => x(d.x[0]))
            .attr("y", (d) => y(d.state) + marginTop - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", 3)
            .attr("fill", (d) => "#ffffff")
            .text((d) => d.x[0].toFixed(0) + "y")

          group
            .append("text")
            .attr("id", (d) => `lump-label-end-${d.state}`)
            .classed("lump-label-end", true)
            .attr("x", (d) => x(d.x[1]))
            .attr("y", (d) => y(d.state) + marginTop - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", 3)
            .attr("fill", (d) => "#ffffff")
            .text((d) => d.x[1].toFixed(0) + "y")

          group
            .append("rect")
            .classed("median-line", true)
            .attr("id", (d) => `median-line-${d.state}`)
            .attr("x", (d) => x(d.median) - medianRect.width / 2)
            .attr("y", (d) => y(d.state) + marginTop - medianRect.height / 2)
            .attr("width", medianRect.width)
            .attr("height", medianRect.height)
            // .attr("rx", "1px")
            // .attr("ry", "1px")
            // .attr("fill", (d) => palette[d.state])
            .attr("fill", "black")
        },
        (update) => {
          update
            .select("line")
            .transition()
            .duration(100)
            .attr("x1", (d) => x(d.x[0]))
            .attr("x2", (d) => x(d.x[1]))
            .duration(300)
            .attr("y1", (d) => y(d.state) + marginTop)
            .attr("y2", (d) => y(d.state) + marginTop)
            .attr("stroke", (d) => palette[d.state])

          update
            .select(".lump-label-start")
            .text((d) => d.x[0].toFixed(0) + "y")
            .transition()
            .duration(100)
            .attr("x", (d) => x(d.x[0]))
            .duration(300)
            .attr("y", (d) => y(d.state) + marginTop - 5)

          update
            .select(".lump-label-end")
            .text((d) => d.x[1].toFixed(0) + "y")
            .transition()
            .duration(100)
            .attr("x", (d) => x(d.x[1]))
            .duration(300)
            .attr("y", (d) => y(d.state) + marginTop - 5)

          update
            .select("rect")
            .transition()
            .duration(300)
            .attr("x", (d) => x(d.median) - medianRect.width / 2)
            .attr("y", (d) => y(d.state) + marginTop - medianRect.height / 2)
            .attr("width", medianRect.width)
            .attr("height", medianRect.height)
            .attr("opacity", 0.5)
          // .attr("fill", (d) => palette[d.state])
        },
        (exit) => exit.call((exit) => exit.transition().duration(300).attr("opacity", 0).remove())
      )
  }, [
    x,
    y,
    selectedLumps,
    filteredSilhouettes,
    isSelectModeLines,
    durationRange,
    startDate,
    palette,
  ])

  return <g id="lumps"></g>
}
