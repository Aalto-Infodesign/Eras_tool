import { useMemo, useState, useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { includes, keyBy, map } from "lodash"
import { scaleLinear, extent } from "d3"

import { useCharts } from "../ChartsContext"
import { useViz } from "../../../../contexts/VizContext"
import { useFilters } from "../../../../contexts/FiltersContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { useClustering } from "../../../../contexts/ClusteringContext"
import { useLumpsData, useStatesDataFromLinks } from "../../../../utils/lumpsHelpers"

import { LumpPolygon } from "./lumps/LumpPolygon"
import { LumpExtremeLine } from "./lumps/LumpExtremeLine"
import { BoxPlot } from "./lumps/BoxPlot"
import { ScrubDots } from "./lumps/ScrubDots"
import { RangeCursor } from "./lumps/RangeCursor"
import { useFlashlight } from "./lumps/useFlashlight"

import "./Lumps.css"

export const Lumps = (props) => {
  const { palette } = useViz()
  const { selectedLumps, toggleSelectedLumps, toggleSelectedTrajectory } = useFilters()
  const { lumps, selectedLinks, filteredLinks } = useDerivedData()
  const { representativeWeights } = useClustering()

  const {
    marginTop,
    chartScales,
    hoveredTrajectoriesIDs,
    setHoveredTrajectoriesIDs,
    selectedIndex,
    reduceMotion,
    enableScrub,
  } = useCharts()

  const animationDuration = reduceMotion ? 0 : 0.2

  const { isSelectModeLines } = props // Keeping isSelectModeLines for the render logic
  const { svgRef } = props
  const { hoveredLump, setHoveredLump } = props
  const { showLinesOfSelectedLumps } = props

  const lumpPadding = 2
  const lumpOffsetX = 2

  const [hoveredLine, setHoveredLine] = useState(null)
  const { cursor, isInFlashlight, radius: flashlightRadius } = useFlashlight(svgRef)

  const highlightedLinks = useMemo(() => {
    if (selectedLinks.length === 0 || hoveredTrajectoriesIDs.length === 0 || selectedIndex === null)
      return []
    return selectedLinks.filter((d) => hoveredTrajectoriesIDs.includes(d.id))
  }, [selectedLinks, hoveredTrajectoriesIDs, selectedIndex])

  // Per-state lump lines follow the represented trajectories (weighted by cluster
  // size), falling back to the full population until clustering produces medoids.
  const lumpLineLinks = selectedLinks
  // const lumpLineLinks = representativeLinks.length ? representativeLinks : selectedLinks
  const globalLumpData = useStatesDataFromLinks(lumpLineLinks, representativeWeights)
  const subsetLumpData = useStatesDataFromLinks(highlightedLinks)
  const statesData = useStatesDataFromLinks(filteredLinks)

  // Whisker source, matched to the range source by state key.
  const statesDataByState = useMemo(() => keyBy(statesData, "state"), [statesData])

  const allTypes = lumps.map((t) => t.type)

  const lumpData = useLumpsData(lumps)
  const presentLumps = lumpData.filter((d) => d.links.length > 1)
  const lumpLinesExtreme = lumpData.filter((d) => d.links.length === 1)

  const allLumps = useMemo(() => {
    return allTypes.map((t) => ({
      type: t,
      present: presentLumps.filter((p) => p.type === t),
    }))
  }, [allTypes, presentLumps])

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
      if (hoveredData.items.length > 300) return
      const visibleCandidates = []

      for (const item of hoveredData.items) {
        const cx = chartScales.x(item.source.x)
        const cy = chartScales.y(hoveredData.state) + marginTop
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
    chartScales,
    marginTop,
    hoveredTrajectoriesIDs,
    isInFlashlight,
    setHoveredTrajectoriesIDs,
  ])

  const opacityScale = useMemo(() => {
    const allLumpItemsLengths = extent(presentLumps.map((l) => l.links.length))

    const scale = scaleLinear(allLumpItemsLengths, [0.5, 0.8])

    return scale
  }, [presentLumps])

  // Click on a range line while scrubbing selects the trajectory under the cursor.
  const handleRangeLineClick = () => {
    hoveredTrajectoriesIDs.length > 0 &&
      enableScrub &&
      toggleSelectedTrajectory(hoveredTrajectoriesIDs[selectedIndex])
  }

  return (
    <g id="lumps">
      <motion.g id={"lump-elements"} animate={{ opacity: subsetLumpData.length > 0 ? 0.5 : 1 }}>
        {/* Lump polygons, one group per source-target type */}
        {!isSelectModeLines &&
          allLumps.map(({ type, present }) => {
            return (
              <motion.g
                key={`lump-group-${type}`}
                id={`lump-group-${type}`}
                className="lump-group"
                animate={{ opacity: showLinesOfSelectedLumps ? 0.5 : 1 }}
              >
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

        {/* Single-link lumps, rendered as bare lines */}
        {!isSelectModeLines &&
          lumpLinesExtreme.map((d) => (
            <LumpExtremeLine
              key={`lump-line-extreme-${d.type}`}
              d={d}
              x={chartScales.x}
              y={chartScales.y}
              marginTop={marginTop}
              isSelected={includes(map(selectedLumps, "type"), d.type)}
              onClick={() => toggleSelectedLumps(d)}
              animationDuration={animationDuration}
            />
          ))}

        {/* Per-state box plots: selected/weighted links as the range line,
            the full filtered population as the whiskers */}
        {globalLumpData.map((d) => {
          const y = chartScales.y(d.state) + marginTop
          return (
            <BoxPlot
              key={`lump-line-group-${d.state}`}
              state={d.state}
              range={d}
              fullRange={statesDataByState[d.state]}
              xScale={chartScales.x}
              y={y}
              color={palette[d.state]}
              strokeWidth={3}
              hasLabels
              interactive
              onHover={setHoveredLine}
              onLeave={() => setHoveredLine(null)}
              onClick={handleRangeLineClick}
              animationDuration={animationDuration}
            >
              {enableScrub && hoveredLine === d.state && (
                <ScrubDots
                  items={d.items}
                  xScale={chartScales.x}
                  absoluteY={y}
                  isInFlashlight={isInFlashlight}
                  onSelect={toggleSelectedTrajectory}
                />
              )}
            </BoxPlot>
          )
        })}
      </motion.g>

      <motion.g id={"scrub-elements"}>
        <AnimatePresence>
          {/* Hovered-trajectories subset, as plain white range lines */}
          {enableScrub &&
            subsetLumpData.map((d) => (
              <BoxPlot
                key={`subset-lump-line-group-${d.state}`}
                variant="subset"
                state={d.state}
                range={d}
                xScale={chartScales.x}
                y={chartScales.y(d.state) + marginTop}
                color={"hsl(0,0%,100%)"}
                strokeWidth={2}
                hasMedian={false}
                onHover={setHoveredLine}
                onClick={handleRangeLineClick}
                animationDuration={animationDuration}
              />
            ))}

          {!isSelectModeLines && hoveredLine && enableScrub && (
            <RangeCursor
              x={cursor.x}
              y={chartScales.y(hoveredLine) + marginTop}
              radius={flashlightRadius}
              animationDuration={animationDuration}
              onLeave={() => setHoveredLine(null)}
            />
          )}
        </AnimatePresence>
      </motion.g>
    </g>
  )
}
