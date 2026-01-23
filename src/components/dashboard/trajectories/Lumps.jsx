import { useContext, useMemo, useState, useEffect } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { includes, flattenDeep, values, map, isNil } from "lodash"
import {
  getMinMaxStateFromTrajectories,
  getMinMaxFromTrajectoriesBetwenTwoStates,
} from "../../../utils/getMinMax"

import { AnimatePresence, motion } from "motion/react"

import { useMouseMove } from "../../hooks/useMouseMove"

import "./Lumps.css"

export const Lumps = (props) => {
  const i = performance.now()
  const trajectoriesContext = useContext(TrajectoriesContext)
  const {
    marginTop,
    palette,
    scales,
    dateRange,
    filters,
    durationRange,
    selectedLumps,
    toggleSelectedLumps,
    selectedTrajectoriesIDs,
    toggleSelectedTrajectory,
    hoveredTrajectoriesIDs,
    setHoveredTrajectoriesIDs,
    selectedIndex,
    filteredLinks,
    reduceMotion,
  } = trajectoriesContext

  const animationDuration = reduceMotion ? 0 : 0.2

  const { filteredSilhouettes } = props
  const { setHoveredLump = () => {} } = props // Removed unused 'hoveredLump' and 'isSelectModeLines' from props
  const { isSelectModeLines } = props // Keeping isSelectModeLines for the render logic
  const { svgRef } = props

  // TODO Perché non disegna??
  // console.log(filteredSilhouettes)

  const { x, y } = scales

  const lumpPadding = 2
  const lumpOffsetX = 2

  const flashlightRadius = 2

  const [hoveredLine, setHoveredLine] = useState(null)

  const mousePosition = useMouseMove()
  // console.log(mousePosition)
  const [svgCursorPosition, setSvgCursorPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!svgRef.current || !mousePosition.x || !mousePosition.y || hoveredLine === null) return

    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = mousePosition.x
    pt.y = mousePosition.y

    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    setSvgCursorPosition({ x: svgP.x, y: svgP.y })
  }, [mousePosition, svgRef, hoveredLine])

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

  const filteredTrajectories = useMemo(() => {
    if (!filteredSilhouettes || filteredSilhouettes.length === 0) return []

    return values(flattenDeep(filteredSilhouettes.map((s) => s.trajectories)))
      .map((t) => ({
        ...t,
        diseaseDuration: isNil(t.diseaseDuration)
          ? filters.diseaseDuration.extent[0]
          : t.diseaseDuration,
      }))
      .filter((d) => d.diseaseDuration >= durationRange[0] && d.diseaseDuration < durationRange[1])
  }, [filteredSilhouettes, durationRange])

  const highlightedTrajectories = useMemo(() => {
    if (filteredLinks.length === 0 || hoveredTrajectoriesIDs.length === 0 || selectedIndex === null)
      return []
    return filteredLinks.filter((d) => hoveredTrajectoriesIDs.includes(d.id))
  }, [filteredLinks, hoveredTrajectoriesIDs, selectedIndex])

  // console.log(highlightedTrajectories)

  const globalLumpData = useMemo(() => {
    return getMinMaxStateFromTrajectories(filteredTrajectories)
  }, [filteredTrajectories])

  const subsetlLumpData = useMemo(() => {
    if (highlightedTrajectories.length === 0) return []
    return getMinMaxStateFromTrajectories(highlightedTrajectories)
  }, [highlightedTrajectories])

  // useEffect(() => {
  //   console.log(subsetlLumpData)
  // }, [subsetlLumpData])

  // useEffect(() => {
  //   console.log(globalLumpData)
  // }, [globalLumpData])

  const dateExtent = trajectoriesContext.filters?.date.extent // Safely get dateExtent
  const minDate = dateExtent ? dateExtent[0] : 0 // Fallback to 0 if not present
  const midpointDate = (minDate + dateRange[0]) / 2

  const [presentTrajectories, pastTrajectories, remoteTrajectories] = useMemo(() => {
    const present = filteredTrajectories.filter((d) => d.source.date >= dateRange[0])
    const past = filteredTrajectories.filter(
      (d) => d.source.date < dateRange[0] && d.source.date >= midpointDate
    )
    const remote = filteredTrajectories.filter((d) => d.source.date < midpointDate)
    return [present, past, remote]
  }, [filteredTrajectories, dateRange, midpointDate])

  const allTypes = useMemo(() => {
    return getMinMaxFromTrajectoriesBetwenTwoStates(filteredTrajectories).map((t) => t.type)
  }, [filteredTrajectories])

  const [presentLumps, pastLumps, remoteLumps, lumpLinesExtreme] = useMemo(() => {
    const processLumps = (trajectories) =>
      getMinMaxFromTrajectoriesBetwenTwoStates(trajectories).filter((d) => d.items.length > 1)

    const pLumps = processLumps(presentTrajectories)
    const paLumps = processLumps(pastTrajectories)
    const rLumps = processLumps(remoteTrajectories)

    const linesExtreme = getMinMaxFromTrajectoriesBetwenTwoStates(presentTrajectories).filter(
      (d) => d.items.length === 1
    )

    return [pLumps, paLumps, rLumps, linesExtreme]
  }, [presentTrajectories, pastTrajectories, remoteTrajectories])

  const allLumps = useMemo(() => {
    return allTypes.map((t) => ({
      type: t,
      present: presentLumps.filter((p) => p.type === t),
      past: pastLumps.filter((p) => p.type === t),
      remote: remoteLumps.filter((p) => p.type === t),
    }))
  }, [allTypes, presentLumps, pastLumps, remoteLumps])

  // const subLumps = useMemo(() => {}, [])

  const medianRect = {
    width: 1,
    height: 1.6,
  }

  const lumpPolygonProps = useMemo(
    () => ({
      x: scales.x,
      y: scales.y,
      marginTop,
      lumpPadding,
      lumpOffsetX,
      palette,
      toggleSelectedLumps,
      setHoveredLump: props.setHoveredLump,
    }),
    [scales, marginTop, palette, toggleSelectedLumps, props.setHoveredLump]
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

    // const reversedVisibleId = reverse(visibleIDs)

    const arraysEqual =
      visibleIDs.length === hoveredTrajectoriesIDs.length &&
      visibleIDs.every((v, i) => v === hoveredTrajectoriesIDs[i])

    if (!arraysEqual) {
      // console.log(visibleIDs)

      setHoveredTrajectoriesIDs(visibleIDs)
    }
  }, [
    mousePosition,
    hoveredLine,
    svgRef,
    globalLumpData,
    x,
    y,
    marginTop,
    hoveredTrajectoriesIDs,
    svgCursorPosition,
  ])
  const f = performance.now()
  // console.log(`Lumps Rendered in ${f - i} ms`)

  return (
    <g id="lumps">
      <AnimatePresence>
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
                  />
                )}

                {/* Past Lumps */}
                {past.length > 0 && (
                  <LumpPolygon
                    {...lumpPolygonProps}
                    data={past[0]}
                    timePlacement={"past"}
                    selectedLumps={selectedLumps}
                    animationDuration={animationDuration}
                  />
                )}

                {/* Remote Lumps */}
                {remote.length > 0 && (
                  <LumpPolygon
                    {...lumpPolygonProps}
                    data={remote[0]}
                    timePlacement={"remote"}
                    selectedLumps={selectedLumps}
                    animationDuration={animationDuration}
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
                y={y}
                marginTop={marginTop}
                onHover={setHoveredLine}
                toggleSelectedTrajectory={toggleSelectedTrajectory}
                hoveredTrajectoriesIDs={hoveredTrajectoriesIDs}
                selectedIndex={selectedIndex}
                strokeWidth={1.5}
                animationDuration={animationDuration}
              />

              <AnimatePresence>
                {hoveredLine === d.state &&
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
                        onClick={() => toggleSelectedTrajectory(item.id)}
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

        {subsetlLumpData.map((d) => {
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
                y={y}
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

        {!isSelectModeLines && hoveredLine && (
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
              onMouseLeave={() => (console.log("exit"), setHoveredLine(null))}
            />
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  )
}

const LumpPolygon = ({
  data,
  timePlacement,
  selectedLumps,
  toggleSelectedLumps,
  setHoveredLump,
  x,
  y,
  marginTop,
  lumpPadding,
  lumpOffsetX,
  palette,
  animationDuration,
}) => {
  // --- Optimization: Memoize createPolygonFromLump and createOriginPolygonFromLump results ---
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

  const id = `lump-${timePlacement}-${data.type}`
  const className = `lump-${timePlacement}`

  const texturePastUrl = "url(#patternLines)"
  const textureRemoteUrl = "url(#patternCircles)"

  let fill = ""

  if (timePlacement === "present")
    if (data.source.state === data.target.state) {
      fill = palette[data.source.state]
    } else {
      fill = `url(#gradient-${data.source.state}-${data.target.state})`
    }
  else if (timePlacement === "past") {
    fill = texturePastUrl
  } else if (timePlacement === "remote") {
    fill = textureRemoteUrl
  }

  const isSelected = includes(map(selectedLumps, "type"), data.type)

  return (
    <motion.polygon
      key={id}
      id={id}
      className={className}
      initial={{ opacity: 0.3, points: originPolygonPoints }}
      animate={{
        opacity: isSelected ? 1 : 0.3,
        points: polygonPoints,
      }}
      exit={{ points: originPolygonPoints }}
      transition={{ duration: animationDuration }}
      fill={fill}
      whileHover={{ opacity: isSelected ? 1 : 0.7 }}
      onClick={() => toggleSelectedLumps(data)}
      onMouseEnter={() => setHoveredLump(data)}
      onMouseLeave={() => setHoveredLump()}
    />
  )
}

const LumpLine = ({
  name,
  d,
  x,
  y,
  marginTop,
  onHover,
  fillColor,
  strokeWidth,
  toggleSelectedTrajectory = () => {},
  hoveredTrajectoriesIDs = [],
  selectedIndex = 0,
  animationDuration,
}) => {
  const handleClick = () => {
    console.log("click")
    hoveredTrajectoriesIDs.length > 0 &&
      toggleSelectedTrajectory(hoveredTrajectoriesIDs[selectedIndex])
  }
  return (
    <motion.line
      id={`${name}-lump-line-${d.state}`}
      className={"lump-line"}
      initial={{
        x1: x(d.x[0]),
        x2: x(d.x[1]),
        y1: marginTop / 2,
        y2: marginTop / 2,
        strokeWidth: 0,
        strokeLinecap: "round",
        stroke: fillColor,
        pathLength: 0,
      }}
      animate={{
        x1: x(d.x[0]),
        x2: x(d.x[1]),
        y1: marginTop / 2,
        y2: marginTop / 2,
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
