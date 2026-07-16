import { useMemo, useState } from "react"
import { useCharts } from "../ChartsContext"
import { motion, AnimatePresence } from "motion/react"
import { isColorDark } from "../../../../utils/colorHelpers"

import { useViz } from "../../../../contexts/VizContext"
import { useFilters } from "../../../../contexts/FiltersContext"

import "./Trajectories.css"

import { flattenDeep, groupBy, minBy, union, uniqBy, mapValues, maxBy } from "lodash"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { useClustering } from "../../../../contexts/ClusteringContext"
import { useDebouncedState } from "hamo"
import { line } from "d3"

export function TrajectoriesMotion(props) {
  const {
    selectedSilhouettesNames,
    selectedTrajectoriesIDs,
    selectedLumps,
    toggleSelectedTrajectory,
  } = useFilters()
  const { palette } = useViz()
  const { selectedLinks, lumps } = useDerivedData()
  const { rankedMedoids, representativeLinks, revealFadedIDs } = useClustering()

  const {
    marginTop,
    chartScales,

    hoveredTrajectoriesIDs,
    selectedIndex,
    enableScrub,
  } = useCharts()

  const { showLinesOfSelectedLumps } = props
  const { isSelectModeLines } = props

  const [markerHoveredId, setMarkerHoveredId] = useDebouncedState(null, 500)
  // Da poi spostare un livello più in alto

  const { x, y } = chartScales

  const rectDimensions = { width: 2, height: 4 }

  /**
   * The medoid representative set is computed once in ClusteringContext (shared
   * with Lumps) — see `representativeLinks` / `revealFadedIDs`. Here we only style
   * it: opacity is view-specific.
   *   - mid-reveal medoids → REVEAL_FADED (the "analysis happening" beat);
   *   - focused mode → fade each medoid by relevance (medoidOpacity);
   *   - settled median + fallback → full opacity.
   */
  const FADED_OPACITY = 0.2
  const REVEAL_FADED = 0.1
  // Floor for relevance fading: even a silhouette's smallest cluster stays this visible
  const MIN_MEDOID_OPACITY = 0.2

  const isOverview = selectedSilhouettesNames.length === 0
  const isTrajectorySelectionActive = selectedTrajectoriesIDs.length > 0

  const representatives = representativeLinks

  // Each medoid represents a cluster of `size` trajectories — that size is its
  // relevance. Fade each medoid relative to the dominant cluster of its own
  // silhouette, so the main path reads boldest and minor variants recede.
  const medoidOpacity = useMemo(() => {
    const maxBySilhouette = new Map()
    for (const m of rankedMedoids) {
      if (m.size > (maxBySilhouette.get(m.silhouette) ?? 0)) {
        maxBySilhouette.set(m.silhouette, m.size)
      }
    }
    const map = new Map()
    for (const m of rankedMedoids) {
      const share = m.size / (maxBySilhouette.get(m.silhouette) || 1) // 0..1 vs. dominant
      map.set(m.id, MIN_MEDOID_OPACITY + (1 - MIN_MEDOID_OPACITY) * share)
    }
    return map
  }, [rankedMedoids])

  const opacityFor = (d) => {
    if (isTrajectorySelectionActive) {
      return selectedTrajectoriesIDs.includes(d.id) ? 1 : FADED_OPACITY
    }
    if (revealFadedIDs.has(d.id)) return REVEAL_FADED // mid-reveal medoids
    if (!isOverview) return medoidOpacity.get(d.id) ?? 1 // focused: fade by relevance
    return 1 // settled median + fallback
  }

  // Selected trajectories are always drawn in full, medoid or not
  const selectedTrajectories = useMemo(
    () =>
      isTrajectorySelectionActive
        ? selectedLinks.filter((d) => selectedTrajectoriesIDs.includes(d.id))
        : [],
    [isTrajectorySelectionActive, selectedLinks, selectedTrajectoriesIDs],
  )

  const highlightedTrajectories = enableScrub
    ? selectedLinks.filter((d) => d.id === hoveredTrajectoriesIDs[selectedIndex])
    : []

  const displayedTrajectories = union(selectedTrajectories, highlightedTrajectories)

  // Foreground of the select-lines mode: medoids + explicit selection. Vertical
  // (duration 0) links are drawn only when a representative carries them — a
  // missing vertical is a clustering concern, not a drawing one.
  const mainLines = useMemo(
    () => union(representatives, selectedTrajectories),
    [representatives, selectedTrajectories],
  )

  // Rank by source.date (when THIS patient entered THIS state), not firstDate:
  // firstDate is per-patient and within a silhouette every patient hits every
  // state, so per-state min/max would collapse to the same two patients
  const extremeLinksByState = useMemo(
    () =>
      mapValues(groupBy(selectedLinks, "source.state"), (links) => ({
        min: minBy(links, "source.date"),
        max: maxBy(links, "source.date"),
      })),
    [selectedLinks],
  )

  // Full trajectories (every link, not just the extreme one) of the patients
  // owning each state's earliest/latest entry — matching on id recovers the
  // whole path
  const extremeTrajectories = useMemo(() => {
    if (isOverview) return []
    const ids = new Set(
      Object.values(extremeLinksByState).flatMap(({ min, max }) => [min?.id, max?.id]),
    )
    ids.delete(undefined)
    // A patient already drawn as a main line (medoid or selected) must not be
    // re-drawn as a faint extreme on top of itself
    for (const l of mainLines) ids.delete(l.id)
    return selectedLinks.filter((l) => ids.has(l.id))
  }, [isOverview, extremeLinksByState, selectedLinks, mainLines])

  const lines =
    (!isSelectModeLines &&
      selectedLumps.length > 0 &&
      showLinesOfSelectedLumps &&
      flattenDeep(selectedLumps.map((l) => l.links))) ||
    (!isSelectModeLines && displayedTrajectories.length > 0 && displayedTrajectories) ||
    (isSelectModeLines && mainLines)

  const singleStateSwitches = (isSelectModeLines ? mainLines : selectedLinks).filter(
    (l) => l.source.state === l.target.state && l.initialState === true && l.finalState === true,
  )

  const singleStatePoints =
    (!isSelectModeLines &&
      selectedLumps.length > 0 &&
      showLinesOfSelectedLumps &&
      singleStateSwitches) ||
    (isSelectModeLines && singleStateSwitches)

  // This function would be called by the triggering element's event handler
  const handleMouseEnter = (d) => {
    // 'd' is the data object from your array
    setMarkerHoveredId(d.id)
  }

  // ...and the cleanup function (onMouseLeave)
  const handleMouseLeave = () => {
    setMarkerHoveredId(null)
  }

  const handleClick = (d) => {
    toggleSelectedTrajectory(d.id)
  }

  const ageMarkers = useMemo(() => {
    if (!markerHoveredId) return
    const hoveredLines = lines.filter((l) => l.id === markerHoveredId)

    const agesSource = hoveredLines.map((l) => ({ id: l.id, x: l.source.x, state: l.source.state }))
    const agesTarget = hoveredLines.map((l) => ({ id: l.id, x: l.target.x, state: l.target.state }))

    const markers = uniqBy([...agesSource, ...agesTarget], "x")
    return markers
  }, [markerHoveredId])

  return (
    <g id="trajectories">
      <AnimatePresence>
        {singleStatePoints &&
          singleStatePoints.map((d) => {
            return (
              <motion.rect
                key={`singleStateSwitch-${d.id}-${d.lump}-${d.source.x}`}
                id={`singleStateSwitch-${d.id}-${d.lump}-${d.source.x}`}
                className={"singleStateSwitch"}
                initial={{
                  x: x(d.source.x) - rectDimensions.width / 2,
                  y: y(d.source.state) + marginTop - rectDimensions.height / 2,
                  width: 0,
                  height: 0,
                }}
                animate={{
                  x: x(d.source.x) - rectDimensions.width / 2,
                  y: y(d.source.state) + marginTop - rectDimensions.height / 2,
                  width: rectDimensions.width,
                  height: rectDimensions.height,
                  fill: palette[d.source.state],
                  opacity: opacityFor(d),
                }}
                exit={{ height: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => toggleSelectedTrajectory(d.id)}
              >
                <title>{`ID: ${d.id}`}</title>
              </motion.rect>
            )
          })}

        {lines &&
          lines.map((d) => {
            const isHovered = hoveredTrajectoriesIDs.includes(d.id)
            const isSelected = selectedTrajectoriesIDs.includes(d.id)

            if (d.speed > 0) {
              const length = Math.hypot(
                Math.abs(x(d.target.x) - x(d.source.x)),
                Math.abs(y(d.target.state) - y(d.source.state)),
              )
              const startGap = 1
              const endGap = 1.2

              const totalGap = startGap + endGap
              const visibleLength = length - totalGap

              const dash = `${visibleLength} ${totalGap} `

              return (
                <MotionLine
                  key={`switch-${d.id}-${d.lump}-${d.source.x}`}
                  d={d}
                  id={`switch-${d.id}-${d.lump}-${d.source.x}`}
                  x1={x(d.source.x)}
                  x2={x(d.target.x)}
                  y1={y(d.source.state) + marginTop}
                  y2={y(d.target.state) + marginTop}
                  color={`url(#gradient-${d.source.state}-${d.target.state})`}
                  isSelected={isSelected}
                  animationDuration={lines.length > 1000 ? 0.0 : 0.2}
                  onClick={() => toggleSelectedTrajectory(d.id)}
                  onMouseEnter={() => handleMouseEnter(d)}
                  onMouseLeave={() => handleMouseLeave()}
                  opacity={opacityFor(d)}
                />
              )
            } else {
              return (
                <DashedMotionLine
                  key={`switch-${d.id}-${d.lump}-${d.source.x}-${d.target.x}`}
                  id={`switch-${d.id}-${d.lump}-${d.source.x}-${d.target.x}`}
                  d={d}
                  x1={x(d.source.x)}
                  x2={x(d.target.x)}
                  y1={y(d.source.state) + marginTop}
                  y2={y(d.target.state) + marginTop}
                  sourceColor={palette[d.source.state]}
                  targetColor={palette[d.target.state]}
                  isSelected={isSelected}
                  animationDuration={lines.length > 1000 ? 0.0 : 0.2}
                  onClick={() => toggleSelectedTrajectory(d.id)}
                  opacity={opacityFor(d)}
                />
              )
            }
          })}

        {extremeTrajectories.map((d) =>
          d.speed > 0 ? (
            <MotionLine
              key={`extreme-${d.id}-${d.lump}-${d.source.x}-${d.target.x}`}
              id={`extreme-${d.id}-${d.lump}-${d.source.x}-${d.target.x}`}
              d={d}
              x1={x(d.source.x)}
              x2={x(d.target.x)}
              y1={y(d.source.state) + marginTop}
              y2={y(d.target.state) + marginTop}
              color={`url(#gradient-${d.source.state}-${d.target.state})`}
              strokeWidth={0.5}
              isSelected={selectedTrajectoriesIDs.includes(d.id)}
              animationDuration={0.2}
              // onClick={() => toggleSelectedTrajectory(d.id)}
              // onMouseEnter={() => handleMouseEnter(d)}
              // onMouseLeave={() => handleMouseLeave()}
              opacity={0.2}
            />
          ) : (
            <DashedMotionLine
              key={`extreme-${d.id}-${d.lump}-${d.source.x}-${d.target.x}`}
              id={`extreme-${d.id}-${d.lump}-${d.source.x}-${d.target.x}`}
              d={d}
              x1={x(d.source.x)}
              x2={x(d.target.x)}
              y1={y(d.source.state) + marginTop}
              y2={y(d.target.state) + marginTop}
              sourceColor={palette[d.source.state]}
              targetColor={palette[d.target.state]}
              strokeWidth={0.2}
              isSelected={selectedTrajectoriesIDs.includes(d.id)}
              animationDuration={0.2}
              opacity={0.2}
            />
          ),
        )}

        {ageMarkers &&
          ageMarkers.map((m) => (
            <motion.g
              key={`marker-${m.id}-${m.x}-${m.state}`}
              id={`marker-${m.id}-${m.x}-${m.state}`}
              className={`marker`}
              initial={{ x: x(m.x), y: y(m.state) + marginTop }}
              animate={{ x: x(m.x), y: y(m.state) + marginTop }}
              transition={{ duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleSelectedTrajectory(m.id)}
            >
              <motion.circle
                className={`marker-circle`}
                initial={{ fill: palette[m.state], r: 0 }}
                animate={{ fill: palette[m.state], r: 6 }}
                exit={{ r: 0 }}
                transition={{ duration: 0.2 }}
              />

              <motion.text
                y={1.5}
                // fill={textColor}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className={`marker-label`}
              >
                {m.x.toFixed(0)}
              </motion.text>
            </motion.g>
          ))}
      </AnimatePresence>
    </g>
  )
}

// A perfectly vertical transition (duration === 0): the same segment drawn twice
// with offset dash phases, alternating source- and target-state colors
const DashedMotionLine = ({ id, sourceColor, targetColor, ...lineProps }) => {
  return (
    <motion.g>
      <MotionLine id={`${id}-1`} color={sourceColor} dash="3 5" dashOffset={-3} {...lineProps} />
      <MotionLine id={`${id}-2`} color={targetColor} dash="3 5" dashOffset={1} {...lineProps} />
    </motion.g>
  )
}

const MotionLine = ({
  d,
  id,
  x1,
  x2,
  y1,
  y2,
  color,
  dash = 0,
  dashOffset = -1,
  strokeWidth = 1,
  isSelected,
  animationDuration,
  onClick,
  onMouseEnter,
  onMouseLeave,
  opacity = 1,
  rotation = 0,
}) => {
  return (
    <motion.line
      // key={id}
      id={id}
      initial={{
        x1: x1,
        x2: x2,
        y1: y1,
        y2: y2,
        strokeWidth: strokeWidth,
        stroke: color,
        strokeDasharray: dash,
        strokeDashoffset: dashOffset,
        opacity: 0,
      }}
      animate={{
        x1: x1,
        x2: x2,
        y1: y1,
        y2: y2,

        strokeDasharray: dash,
        strokeDashoffset: dashOffset,
        strokeWidth: isSelected ? 1.5 : strokeWidth,
        stroke: color,

        opacity: opacity,
        rotate: rotation,
      }}
      whileHover={{ strokeWidth: isSelected ? 2 : 1.5 }}
      exit={{ opacity: 0 }}
      transition={{
        default: { duration: animationDuration },
        opacity: { duration: 0.3 },
        strokeWidth: { duration: 0.1 },
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <title>{`Duration: ${(d.target.age - d.source.age).toFixed(2)} years `}</title>
    </motion.line>
  )
}
