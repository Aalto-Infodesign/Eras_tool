import { useContext, useMemo, useState, useEffect } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { includes, map } from "lodash"
import {
  getMinMaxStateFromTrajectories,
  getMinMaxFromTrajectoriesBetweenTwoStates,
} from "../../../utils/getMinMax"

import { AnimatePresence, motion } from "motion/react"

import { useMouseMoveSvg } from "../../hooks/useMouseMove"

import { useViz } from "../../../contexts/VizContext"
import { useFilters } from "../../../contexts/FiltersContext"
import "./Lumps.css"

import { scaleLinear, extent } from "d3"

export const Lumps = (props) => {
  const { palette } = useViz()
  const { filters } = useFilters()

  const trajectoriesContext = useContext(TrajectoriesContext)
  const {
    marginTop,
    chartScales,
    selectedLumps,
    toggleSelectedLumps,
    toggleSelectedTrajectory,
    hoveredTrajectoriesIDs,
    setHoveredTrajectoriesIDs,
    selectedIndex,
    filteredLinks,
    reduceMotion,
    enableScrub,
  } = trajectoriesContext

  const animationDuration = reduceMotion ? 0 : 0.2

  const { isSelectModeLines } = props // Keeping isSelectModeLines for the render logic
  const { svgRef } = props
  const { hoveredLump, setHoveredLump } = props

  const { x, y } = chartScales

  const lumpPadding = 2
  const lumpOffsetX = 2

  const flashlightRadius = 2

  const [hoveredLine, setHoveredLine] = useState(null)
  const svgCursorPosition = useMouseMoveSvg(svgRef)

  // Function to convert and check if circle is in flashlight
  const isInFlashlight = (cx, cy) => {
    const dx = svgCursorPosition.x - cx
    const dy = svgCursorPosition.y - cy
    const distance = Math.sqrt(dx * dx + dy * dy)

    return {
      visible: distance < flashlightRadius,
      opacity: Math.max(0, 1 - distance / flashlightRadius),
    }
  }

  const highlightedTrajectories = useMemo(() => {
    if (filteredLinks.length === 0 || hoveredTrajectoriesIDs.length === 0 || selectedIndex === null)
      return []
    return filteredLinks.filter((d) => hoveredTrajectoriesIDs.includes(d.id))
  }, [filteredLinks, hoveredTrajectoriesIDs, selectedIndex])

  const globalLumpData = useMemo(() => {
    return getMinMaxStateFromTrajectories(filteredLinks)
  }, [filteredLinks])

  const subsetLumpData = useMemo(() => {
    if (highlightedTrajectories.length === 0) return []
    return getMinMaxStateFromTrajectories(highlightedTrajectories)
  }, [highlightedTrajectories])

  const dateExtent = filters.date.extent // Safely get dateExtent
  const minDate = dateExtent ? dateExtent[0] : 0 // Fallback to 0 if not present

  const allTypes = useMemo(() => {
    return getMinMaxFromTrajectoriesBetweenTwoStates(filteredLinks).map((t) => t.type)
  }, [filteredLinks])

  const [presentLumps, lumpLinesExtreme] = useMemo(() => {
    const processLumps = (trajectories) =>
      getMinMaxFromTrajectoriesBetweenTwoStates(trajectories).filter((d) => d.items.length > 1)

    const pLumps = processLumps(filteredLinks)

    const linesExtreme = getMinMaxFromTrajectoriesBetweenTwoStates(filteredLinks).filter(
      (d) => d.items.length === 1,
    )

    return [pLumps, linesExtreme]
  }, [filteredLinks])

  const allLumps = useMemo(() => {
    return allTypes.map((t) => ({
      type: t,
      present: presentLumps.filter((p) => p.type === t),
    }))
  }, [allTypes, presentLumps])

  const medianRect = {
    width: 1,
    height: 1.6,
  }

  const lumpPolygonProps = useMemo(
    () => ({
      x: chartScales.x,
      y: chartScales.y,
      marginTop,
      lumpPadding,
      lumpOffsetX,
      palette,
      toggleSelectedLumps,
      hoveredLump,
      setHoveredLump,
    }),
    [chartScales, marginTop, palette, toggleSelectedLumps, setHoveredLump, hoveredLump],
  )

  useEffect(() => {
    if (!hoveredLine || !svgRef.current) {
      if (hoveredTrajectoriesIDs.length !== 0) setHoveredTrajectoriesIDs([])
      return
    }

    const visibleIDs = []
    const hoveredData = globalLumpData.find((d) => d.state === hoveredLine)

    if (hoveredData) {
      const visibleCandidates = []

      for (const item of hoveredData.items) {
        const cx = x(item.x)
        const cy = y(hoveredData.state) + marginTop
        const flashlight = isInFlashlight(cx, cy)

        if (flashlight.visible) {
          visibleCandidates.push({ id: item.id, x: item.x })
        }
      }

      visibleCandidates.sort((a, b) => a.x - b.x)

      for (let i = 0; i < visibleCandidates.length && visibleIDs.length < 10; i++) {
        visibleIDs.push(visibleCandidates[i].id)
      }
    }

    const arraysEqual =
      visibleIDs.length === hoveredTrajectoriesIDs.length &&
      visibleIDs.every((v, i) => v === hoveredTrajectoriesIDs[i])

    if (!arraysEqual) {
      setHoveredTrajectoriesIDs(visibleIDs)
    }
  }, [
    hoveredLine,
    svgRef,
    globalLumpData,
    x,
    y,
    marginTop,
    hoveredTrajectoriesIDs,
    svgCursorPosition,
    setHoveredTrajectoriesIDs,
  ])

  const opacityScale = useMemo(() => {
    const allLumpItemsLengths = extent(presentLumps.map((l) => l.items.length))

    const scale = scaleLinear(allLumpItemsLengths, [0.5, 0.8])

    return scale
  }, [presentLumps])

  return (
    <g id="lumps">
      {/* <AnimatePresence> */}
      {!isSelectModeLines &&
        allLumps.map((d) => {
          const { type, present, past, remote } = d
          return (
            <motion.g key={`lump-group-${type}`} id={`lump-group-${type}`} className="lump-group">
              {/* Present Lumps */}
              {present.length > 0 && (
                <LumpPolygon
                  {...lumpPolygonProps}
                  data={present[0]}
                  timePlacement={"present"}
                  selectedLumps={selectedLumps}
                  animationDuration={animationDuration}
                  opacityScale={opacityScale}
                />
              )}
            </motion.g>
          )
        })}

      {/* Lump Lines Extreme (items.length === 1) */}
      {!isSelectModeLines &&
        lumpLinesExtreme.map((d) => {
          const isSelected = includes(map(selectedLumps, "type"), d.type)
          return (
            <motion.line
              key={`lump-line-extreme-${d.type}`}
              id={`lump-line-extreme-${d.type}`}
              className={"lump-line-extreme"}
              initial={{
                strokeWidth: 2,
                opacity: 0,
                stroke: `url(#gradient-${d.source.state}-${d.target.state})`,
                strokeLinecap: "round",
                pathLength: 0,
                x1: x(d.source.x[0]),
                x2: x(d.target.x[0]),
                y1: y(d.source.state) + marginTop,
                y2: y(d.target.state) + marginTop,
              }}
              animate={{
                opacity: isSelected ? 1 : 0.3,
                x1: x(d.source.x[0]),
                x2: x(d.target.x[0]),
                y1: y(d.source.state) + marginTop,
                y2: y(d.target.state) + marginTop,
                pathLength: 1,
                strokeWidth: 1,
              }}
              whileHover={{ strokeWidth: 2, opacity: isSelected ? 1 : 0.3 }}
              exit={{ strokeWidth: 0, pathLength: 0 }}
              transition={{ duration: animationDuration }}
              onClick={() => toggleSelectedLumps(d)}
              // onMouseEnter={() => setHoveredLump(d)}
              // onMouseLeave={() => setHoveredLump()}
            />
          )
        })}

      {/* Global Lump Data Lines/Labels (Per State) */}
      {globalLumpData.map((d) => {
        return (
          <motion.g
            key={`lump-line-group-${d.state}`}
            id={`lump-line-group-${d.state}`}
            className="lump-line-group"
            whileHover={"hovered"}
            initial={{ y: y(d.state) + marginTop - 5 }}
            animate={{ y: y(d.state) + marginTop - 5 }}
            transition={{ duration: animationDuration }}
            onMouseLeave={() => setHoveredLine(null)}
            onMouseEnter={() => setHoveredLine(d.state)}
          >
            {/* Transparent rect for interaction */}
            <rect
              x={x(d.x[0])}
              width={x(d.x[1]) - x(d.x[0])}
              height={5}
              fill="transparent"
              opacity={0.5}
            />
            <LumpLine
              name={"main"}
              d={d}
              fillColor={palette[d.state]}
              x={x}
              y={marginTop / 2}
              marginTop={marginTop}
              onHover={setHoveredLine}
              toggleSelectedTrajectory={toggleSelectedTrajectory}
              hoveredTrajectoriesIDs={hoveredTrajectoriesIDs}
              selectedIndex={selectedIndex}
              strokeWidth={1.5}
              animationDuration={animationDuration}
            />

            <AnimatePresence>
              {enableScrub &&
                hoveredLine === d.state &&
                d.items.map((item) => {
                  const cx = x(item.x)
                  const cy = y(d.state) + marginTop
                  const flashlight = isInFlashlight(cx, cy)

                  if (!flashlight.visible) return null

                  return (
                    <motion.circle
                      id={`lump-${item.state}-circle-${item.id}-${item.x}`}
                      key={`lump-${item.state}-circle-${item.id}-${item.x}`}
                      initial={{ cx: cx, cy: cy, r: 0, opacity: flashlight.opacity * 0.8 }}
                      animate={{
                        fill: "white",
                        r: flashlight.opacity * 2,
                      }}
                      exit={{ r: 0 }}
                      whileHover={{ scale: 1.5, opacity: 1 }}
                      onClick={() => enableScrub && toggleSelectedTrajectory(item.id)}
                      style={{ cursor: "pointer" }}
                    />
                  )
                })}
            </AnimatePresence>

            <motion.g id={`lump-labels-${d.state}`} className={"lump-labels"}>
              <motion.text
                id={`lump-label-start-${d.state}`}
                className={`lump-label-start`}
                fontSize={3}
                initial={{ x: x(d.x[0]), y: 0, opacity: 0 }}
                animate={{ x: x(d.x[0]), y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: animationDuration }}
              >
                {d.x[0].toFixed(0) + "y"}
              </motion.text>
              <motion.text
                id={`lump-label-end-${d.state}`}
                className={`lump-label-end`}
                fontSize={3}
                initial={{ x: x(d.x[1]), y: 0, opacity: 0 }}
                animate={{ x: x(d.x[1]), y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: animationDuration }}
              >
                {d.x[1].toFixed(0) + "y"}
              </motion.text>
            </motion.g>

            <motion.rect
              id={`median-line-${d.state}`}
              className={"median-line"}
              initial={{
                width: 0,
                height: medianRect.height,
                x: x(d.median) - medianRect.width / 2,
                y: 5 - medianRect.height / 2,
              }}
              animate={{
                width: medianRect.width,
                x: x(d.median) - medianRect.width / 2,
                y: 5 - medianRect.height / 2,
              }}
              exit={{ width: 0 }}
              transition={{ duration: animationDuration }}
            />
          </motion.g>
        )
      })}

      {enableScrub &&
        subsetLumpData.map((d) => {
          return (
            <motion.g
              key={`$subset-lump-line-group-${d.state}`}
              id={`$subset-lump-line-group-${d.state}`}
              className="subset-lump-line-group"
              whileHover={"hovered"}
              initial={{ y: y(d.state) + marginTop - 5 }}
              animate={{ y: y(d.state) + marginTop - 5 }}
            >
              <LumpLine
                name={"subset"}
                d={d}
                fillColor={"hsl(0,0%,100%)"}
                x={x}
                y={marginTop / 2}
                marginTop={marginTop}
                onHover={setHoveredLine}
                toggleSelectedTrajectory={toggleSelectedTrajectory}
                hoveredTrajectoriesIDs={hoveredTrajectoriesIDs}
                selectedIndex={selectedIndex}
                strokeWidth={2.5}
                animationDuration={animationDuration}
              />
            </motion.g>
          )
        })}

      {!isSelectModeLines && hoveredLine && enableScrub && (
        <motion.g
          id="range-cursor"
          key="range-cursor"
          initial={{ y: y(hoveredLine) + marginTop, x: svgCursorPosition.x }}
          animate={{ y: y(hoveredLine) + marginTop, x: svgCursorPosition.x }}
          exit={{ y: y(hoveredLine) + marginTop, x: svgCursorPosition.x }}
          transition={{ default: { duration: animationDuration }, x: { duration: 0 } }}
          style={{ pointerEvents: "none" }}
        >
          <motion.line
            initial={{ y2: 4 }}
            animate={{ y2: -4 }}
            exit={{ y2: 4 }}
            y1={4}
            stroke="white"
            strokeWidth={0.5}
            strokeOpacity={0.6}
          />
          <motion.rect
            initial={{
              x: -flashlightRadius / 2,
              y: -3,
              width: 0,
              height: 6,
            }}
            animate={{
              x: -flashlightRadius,
              width: flashlightRadius * 2,
            }}
            exit={{
              x: -flashlightRadius,
              width: 0,
            }}
            transition={{
              default: { duration: animationDuration, ease: "easeInOut" },
              x: { duration: 0 },
            }}
            fill="white"
            fillOpacity={0.3}
            stroke="white"
            // strokeOpacity={0.1}
            strokeWidth={0}
            rx={1}
            onMouseLeave={() => setHoveredLine(null)}
          />
        </motion.g>
      )}
      {/* </AnimatePresence> */}
    </g>
  )
}

const LumpPolygon = ({
  data,
  timePlacement,
  selectedLumps,
  toggleSelectedLumps,
  hoveredLump,
  setHoveredLump,
  x,
  y,
  marginTop,
  lumpPadding,
  lumpOffsetX,
  palette,
  animationDuration,
  opacityScale,
}) => {
  const { isDragging } = useFilters()
  // --- Memoize polygon calculations ---
  const [polygonPoints, originPolygonPoints] = useMemo(() => {
    function createPolygonFromLump(data) {
      const sourceY = y(data.source.state) + marginTop
      const targetY = y(data.target.state) + marginTop
      const sourcePadding = targetY > sourceY ? lumpPadding : -lumpPadding
      const targetPadding = targetY > sourceY ? -lumpPadding : lumpPadding
      const offsetX = targetY > sourceY ? -lumpOffsetX : lumpOffsetX

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

      return `${x(data.source.x[0]) - offsetX},${sourceY + sourcePadding} ${
        x(data.source.x[0]) - offsetX
      },${sourceY + sourcePadding} ${x(data.target.x[0]) + offsetX},${targetY + targetPadding} ${
        x(data.target.x[0]) + offsetX
      },${targetY + targetPadding}`
    }

    return [createPolygonFromLump(data), createOriginPolygonFromLump(data)]
  }, [data, x, y, marginTop, lumpPadding, lumpOffsetX])

  // --- Calculate fill based on time placement ---
  const fill = useMemo(() => {
    if (timePlacement === "present") {
      if (data.source.state === data.target.state) {
        return palette[data.source.state]
      } else {
        return `url(#gradient-${data.source.state}-${data.target.state})`
      }
    } else if (timePlacement === "past") {
      return "url(#patternLines)"
    } else if (timePlacement === "remote") {
      return "url(#patternCircles)"
    }
    return ""
  }, [timePlacement, data.source.state, data.target.state, palette])

  // --- Calculate selection and hover states ---
  const isSelected = includes(map(selectedLumps, "type"), data.type)
  const isHovered = hoveredLump && hoveredLump.type === data.type

  // --- Calculate opacity based on hover and selection state ---
  const opacity = useMemo(() => {
    const baseOpacity = opacityScale(data.items.length)

    if (isSelected) {
      // This lump is selected but not hovered: use base opacity
      return 1
    }
    if (!hoveredLump) {
      // Nothing is hovered: use scale-based opacity
      return baseOpacity
    }

    if (isHovered) {
      // This lump is hovered: boost opacity further if selected
      return isSelected ? 1 : opacityScale(data.items.length)
    }

    // Something else is hovered: decrease opacity
    return 0.1
  }, [hoveredLump, isHovered, isSelected, opacityScale, data.items.length])

  // console.log(opacity)

  const id = `lump-${timePlacement}-${data.type}`
  const className = `lump-${timePlacement}`

  return (
    <motion.polygon
      key={id}
      id={id}
      className={className}
      initial={{ opacity: 0.1, points: originPolygonPoints }}
      animate={{
        opacity: opacity,
        points: polygonPoints,
        scaleY: isDragging ? 0.9 : 1,
      }}
      exit={{ points: originPolygonPoints }}
      transition={{ duration: animationDuration }}
      fill={fill}
      style={{ cursor: "pointer" }}
      onClick={() => toggleSelectedLumps(data)}
      onMouseEnter={() => setHoveredLump(data)}
      onMouseLeave={() => setHoveredLump(null)}
    />
  )
}

const LumpLine = ({
  name,
  d,
  x,
  y,

  onHover,
  fillColor,
  strokeWidth,
  toggleSelectedTrajectory = () => {},
  hoveredTrajectoriesIDs = [],
  selectedIndex = 0,
  animationDuration,
}) => {
  const { enableScrub } = useContext(TrajectoriesContext)
  const handleClick = () => {
    console.log("click")
    hoveredTrajectoriesIDs.length > 0 &&
      enableScrub &&
      toggleSelectedTrajectory(hoveredTrajectoriesIDs[selectedIndex])
  }

  return (
    <motion.line
      id={`${name}-lump-line-${d.state}`}
      className={"lump-line"}
      initial={{
        x1: x(d.x[0]),
        x2: x(d.x[1]),
        y1: y,
        y2: y,
        strokeWidth: 0,
        strokeLinecap: "round",
        stroke: fillColor,
        pathLength: 0,
      }}
      animate={{
        x1: x(d.x[0]),
        x2: x(d.x[1]),
        y1: y,
        y2: y,
        strokeWidth: strokeWidth,
        stroke: fillColor,
        // stroke: palette[d.state],

        pathLength: 1,
      }}
      exit={{ pathLength: 0, strokeWidth: 0 }}
      // whileHover={{ strokeWidth: 2.5 }}
      transition={{ duration: animationDuration }}
      onMouseEnter={() => onHover(d.state)}
      // onMouseLeave={() => onHover(null)}
      onClick={handleClick}

      // onMouseLeave={() => setHoveredLine(null)}
    />
  )
}
