import { useState, useEffect, useMemo } from "react"
import { scaleBand, scaleLinear, max } from "d3"
import { isNil, xorBy, xor, includes, flattenDeep } from "lodash"

import { ClearButton } from "../common/Button/ClearButton"

import { motion, AnimatePresence } from "motion/react"

import "./ExplorerChart.css"

import { PartialOrderChart } from "./partial-order/PartialOrderChart"
import { TrajectoriesChart } from "./trajectories/TrajectoriesChart"
import { TrajectoriesContext } from "./TrajectoriesContext"
import { DownloadPanel } from "../common/ExportPanel/DownloadPanel"

import { useModifierKey } from "../hooks/useModifierKey"

import { SilhouetteToggleButton } from "./silhouettes/SilhouettesMorph"
import { Legend } from "./legend/Legend"

import { useData } from "../../contexts/ProcessedDataContext"
import { useViz } from "../../contexts/VizContext"
import { useFilters } from "../../contexts/FiltersContext"
import { Virtuoso } from "react-virtuoso"

import { X } from "lucide-react"
import { useDerivedData } from "../../contexts/DerivedDataContext"

export function TrajectoriesExplorerChart(props) {
  console.time("Explorer Chart")
  // Props

  const { silhouettes, analytics, statesData } = useData()
  const { palette, statesOrder, chartType, setChartType } = useViz()
  const {
    filters,
    selectedTrajectoriesIDs,
    setSelectedTrajectoriesIDs,
    selectedSilhouettesNames,
    toggleSilhouetteFilter,
  } = useFilters()

  const { filteredTrajectories } = useDerivedData()

  const { w, h, marginTop } = props
  const { ageRange } = analytics
  const { statesNames } = statesData

  const links = filteredTrajectories.flat()

  const { reduceMotion } = props

  const [selectedLumps, setSelectedLumps] = useState([])
  const [hoveredTrajectoriesIDs, setHoveredTrajectoriesIDs] = useState([])

  const [selectedIndex, setSelectedIndex] = useState(0)

  const [chipHoveredId, setChipHoveredId] = useState(null)

  const isArrowLeft = useModifierKey("ArrowLeft")
  const isArrowRight = useModifierKey("ArrowRight")

  // clamp selectedIndex when hoveredTrajectoriesIDs length changes
  useEffect(() => {
    const maxIndex = Math.max(0, hoveredTrajectoriesIDs.length - 1)
    setSelectedIndex((prev) => Math.min(prev, maxIndex))
  }, [hoveredTrajectoriesIDs.length])

  // navigate selectedIndex with Left/Right arrows while modifier key is pressed
  useEffect(() => {
    if (isArrowRight) {
      setSelectedIndex((prev) => {
        const max = Math.max(0, hoveredTrajectoriesIDs.length - 1)
        return Math.min(prev + 1, max)
      })
    } else if (isArrowLeft) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    }
  }, [isArrowLeft, isArrowRight, hoveredTrajectoriesIDs.length])

  const toggleSelectedTrajectory = (trajectoryID) => {
    const newSelection = xor(selectedTrajectoriesIDs, [trajectoryID])
    setSelectedTrajectoriesIDs(newSelection)
  }
  const isTrajectoriesFilterActive = selectedTrajectoriesIDs.length > 0

  const toggleSelectedLumps = (lump) => {
    const newSelection = xorBy(selectedLumps, [lump], "type")
    setSelectedLumps(newSelection)
  }

  const isLumpFilterActive = selectedLumps.length > 0

  const isFilterActive = isLumpFilterActive || isTrajectoriesFilterActive

  // STATES ORDER
  const statesNamesLoaded = isNil(statesOrder) ? statesNames.sort() : statesOrder
  const yScale = scaleBand(statesNamesLoaded, [0, 100]).padding(1)
  const xScale = scaleLinear([0, max(silhouettes.map((d) => d.states.length - 1))], [10, 100 - 10])

  // FILTERING SILHOUETTES and TRAJECTORIES
  // TODO FiltersContext

  // 1. MEMOIZZA I LINK COMPLETI (Evita ricreazione continua)
  const completeLinks = useMemo(() => {
    return links.map((s) => ({
      ...s,
      lump: s.source.state + "-" + s.target.state,
    }))
  }, [links])

  // 2. OTTIMIZZA IL SET DI INDIVIDUI (Usa Set per ricerca O(1))
  const { filteredSilhouettes, selectedIndividualsSet } = useMemo(() => {
    const filtered =
      selectedSilhouettesNames.length === 0
        ? silhouettes
        : silhouettes.filter((d) => selectedSilhouettesNames.includes(d.name))

    // Creiamo un Set: includes() su un Set è istantaneo, su un Array è O(n)
    const individuals = new Set(flattenDeep(filtered.map((s) => s.trajectories)).map((t) => t.id))

    return { filteredSilhouettes: filtered, selectedIndividualsSet: individuals }
  }, [silhouettes, selectedSilhouettesNames])

  // 3. FILTRAGGIO EFFICIENTE
  const filteredLinks = useMemo(() => {
    const selectedLumpsTypes = new Set(selectedLumps.map((l) => l.type))
    const hasLumpFilter = selectedLumps.length > 0

    return completeLinks.filter((l) => {
      // Ricerca O(1) invece di O(n)
      if (!selectedIndividualsSet.has(l.id)) return false
      if (hasLumpFilter && !selectedLumpsTypes.has(l.lump)) return false

      // if (!isNil(l.diseaseDuration)) {
      //   return (
      //     l.diseaseDuration >= filters.diseaseDuration.selection[0] &&
      //     l.diseaseDuration < filters.diseaseDuration.selection[1]
      //   )
      // }
      return true
    })
  }, [completeLinks, selectedIndividualsSet, selectedLumps, filters])

  console.log(completeLinks)

  // 4. MAPPA PER RICERCA SILHOUETTE (Evita loop annidati)
  const idToSilhouetteMap = useMemo(() => {
    const map = new Map()
    silhouettes.forEach((s) => {
      s.trajectories.forEach((t) => {
        // Assumendo che t sia un array di punti o un oggetto con id
        const id = Array.isArray(t) ? t[0].id : t.id
        map.set(id, s.name)
      })
    })
    return map
  }, [silhouettes])

  const selectedIDssWithSilhouette = useMemo(() => {
    return selectedTrajectoriesIDs.map((id) => ({
      id: id,
      silhouette: idToSilhouetteMap.get(id),
    }))
  }, [selectedTrajectoriesIDs, idToSilhouetteMap])

  const chartScales = useMemo(
    () => ({
      x: scaleLinear([0, ageRange[1]], [0, w]),
      y: scaleBand(statesNamesLoaded, [0, h]),
    }),
    [ageRange, statesNamesLoaded, w, h],
  )

  const chartRowSpan = Math.floor(statesNamesLoaded.length / 6) + 1

  const enableScrub = filteredLinks.length < 2000

  const contextValue = useMemo(
    () => ({
      // COORDS
      w,
      h,
      marginTop,

      //DATA
      completeLinks,
      filteredLinks,
      filteredSilhouettes,

      statesNamesLoaded,
      chartScales,
      selectedLumps,
      toggleSelectedLumps,

      toggleSelectedTrajectory,
      hoveredTrajectoriesIDs,
      setHoveredTrajectoriesIDs,
      selectedIndex,

      //UI
      reduceMotion,
      enableScrub,
    }),
    [
      w,
      h,
      filteredLinks,
      completeLinks,
      filteredSilhouettes,

      // dateRange,
      // durationRange,
      statesNamesLoaded,
      selectedLumps,
      toggleSelectedLumps,

      toggleSelectedTrajectory,
      hoveredTrajectoriesIDs,
      setHoveredTrajectoriesIDs,
      selectedIndex,
      reduceMotion,
    ],
  )

  const filterVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  }
  const childrenVariants = {
    hidden: { opacity: 0, y: 5, transition: { duration: 0.2 } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    hovered: { scale: 0.95 },
  }

  const closeBtnVariants = {
    hidden: { scale: 0 },
    visible: { scale: 1, transition: { ease: "easeInOut" } },
  }

  console.timeEnd("Explorer Chart")

  return (
    <>
      <motion.section
        layout
        key={"chart"}
        className="bento-item chart"
        style={{ gridRow: `span ${chartRowSpan}` }}
      >
        {/* TODO! Toggle between chart types */}
        <motion.div layout className="function-row">
          <div className="chart-modes">
            <motion.button
              whileHover={{ scale: 0.95 }}
              onClick={() => setChartType(1)}
              data-selected={chartType === 1}
            >
              Linear
            </motion.button>
            <button onClick={() => setChartType(2)} data-selected={chartType === 2}>
              Parallel
            </button>
          </div>
          <DownloadPanel />
        </motion.div>
        <div className="chart-wrapper">
          <TrajectoriesContext.Provider value={contextValue}>
            <motion.section
              key={chartType}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="trajectories-chart"
            >
              {chartType === 1 && <TrajectoriesChart />}

              {chartType === 2 && <PartialOrderChart />}
            </motion.section>
          </TrajectoriesContext.Provider>

          <Legend />
        </div>
      </motion.section>

      <motion.section
        layout
        key={"filtered-items"}
        className="bento-item filtered-items"
        style={{ backgroundColor: isFilterActive ? "var(--surface-secondary)" : "" }}
      >
        <motion.h3 layout>
          {isFilterActive
            ? "Filtered items"
            : "Select lumps or lines from the chart to highlight them"}
        </motion.h3>
        <AnimatePresence mode="popLayout">
          {isLumpFilterActive && (
            <motion.div
              layout
              key={"lump-filters"}
              variants={filterVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="filter-container"
            >
              <ClearButton isActive={isLumpFilterActive} clearFunction={setSelectedLumps}>
                Clear
              </ClearButton>
              <div className="filter-bar padded">
                <AnimatePresence>
                  {selectedLumps.map((l, i) => {
                    return (
                      <motion.div
                        layout
                        key={`${l.source.state}-${l.target.state}`}
                        variants={childrenVariants}
                        className="chip"
                        onHoverStart={() => setChipHoveredId(`${l.source.state}-${l.target.state}`)}
                        onHoverEnd={() => setChipHoveredId(null)}
                      >
                        <p>
                          <span style={{ color: palette[l.source.state] }}>{l.source.state}</span>
                          <span>-</span>
                          <span style={{ color: palette[l.target.state] }}>{l.target.state}</span>
                        </p>
                        <motion.button
                          className="close-btn"
                          variants={closeBtnVariants}
                          initial={"hidden"}
                          animate={
                            chipHoveredId === `${l.source.state}-${l.target.state}`
                              ? "visible"
                              : "hidden"
                          }
                          layout
                          onClick={() => toggleSelectedLumps(l)}
                        >
                          <X size={20} />
                        </motion.button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {isTrajectoriesFilterActive && (
            <motion.div
              layout
              key={"trajectories-filters"}
              variants={filterVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="filter-container"
            >
              <ClearButton
                isActive={isTrajectoriesFilterActive}
                clearFunction={setSelectedTrajectoriesIDs}
              >
                Clear
              </ClearButton>
              <div className="filter-bar padded">
                <AnimatePresence>
                  <Virtuoso
                    className="virtuoso-scroller-wrapper"
                    style={{
                      height: "100px",
                      width: "100%",
                      paddingLeft: "10px",
                    }}
                    horizontalDirection
                    data={selectedIDssWithSilhouette}
                    itemContent={(i, id) => {
                      const isSelected = includes(selectedSilhouettesNames, id.silhouette)

                      return (
                        <div
                          className="virtuoso-scroller"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: "100%",
                            marginRight: "8px", // spacing between items
                          }}
                        >
                          <motion.div
                            key={id.id}
                            variants={childrenVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="chip"
                            onHoverStart={() => setChipHoveredId(id.id)}
                            onHoverEnd={() => setChipHoveredId(null)}
                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                          >
                            <SilhouetteToggleButton
                              silhouetteName={id.silhouette}
                              isSelected={isSelected}
                              toggleSilhouetteFilter={toggleSilhouetteFilter}
                              palette={palette}
                              x={xScale}
                              y={yScale}
                            />

                            <span>{id.id}</span>

                            <motion.button
                              className="close-btn"
                              variants={closeBtnVariants}
                              initial="hidden"
                              animate={chipHoveredId === id.id ? "visible" : "hidden"}
                              onClick={() => toggleSelectedTrajectory(id.id)}
                            >
                              <X size={20} />
                            </motion.button>
                          </motion.div>
                        </div>
                      )
                    }}
                  />
                  {/* {selectedIDssWithSilhouette.map((id, i) => {
                    const isSelected = includes(selectedSilhouettes, id.silhouette)
                    return (
                      <motion.div
                        layout
                        key={id.id}
                        variants={childrenVariants}
                        initial={"hidden"}
                        animate={"visible"}
                        exit={"hidden"}
                        className="chip"
                        onHoverStart={() => setChipHoveredId(id.id)}
                        onHoverEnd={() => setChipHoveredId(null)}
                      >
                        
                        <motion.div
                          layout
             
                        >
                          <SilhouetteToggleButton
                            silhouetteName={id.silhouette}
                            isSelected={isSelected}
                            toggleSilhouetteFilter={toggleSilhouetteFilter}
                            palette={palette}
                            x={xScale}
                            y={yScale}
                          />
                        </motion.div>
            
                        <motion.p layout>
                          <span>{id.id}</span>
                        </motion.p>
                        <motion.button
                          className="close-btn"
                          variants={closeBtnVariants}
                          initial={"hidden"}
                          animate={chipHoveredId === id.id ? "visible" : "hidden"}
                          layout
                          onClick={() => toggleSelectedTrajectory(id.id)}
                        >
                          ×
                        </motion.button>
                      </motion.div>
                    )
                  })} */}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </>
  )
}
