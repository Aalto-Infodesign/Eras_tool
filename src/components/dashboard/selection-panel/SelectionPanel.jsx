import { useState, useEffect, useMemo } from "react"
import { includes } from "lodash"

import { ClearButton } from "../../common/Button/ClearButton"

import { motion, AnimatePresence } from "motion/react"

import "./SelectionPanel.css"

import { useModifierKey } from "../../hooks/useModifierKey"

import { SilhouetteToggleButton } from "../silhouettes/SilhouettesMorph"

import { useViz } from "../../../contexts/VizContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { Virtuoso } from "react-virtuoso"

import { useDerivedData } from "../../../contexts/DerivedDataContext"

import { CloseButton } from "../../common/Button/CloseButton"

export function SelectionPanel() {
  console.time("Explorer Chart")

  const { palette } = useViz()
  const {
    selectedTrajectoriesIDs,
    setSelectedTrajectoriesIDs,
    toggleSelectedTrajectory,
    selectedSilhouettesNames,
    toggleSilhouetteFilter,
    selectedLumps,
    setSelectedLumps,
    toggleSelectedLumps,
  } = useFilters()

  const { silhouettes } = useDerivedData()

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

  const isTrajectoriesFilterActive = selectedTrajectoriesIDs.length > 0

  const isLumpFilterActive = selectedLumps.length > 0

  const isFilterActive = isLumpFilterActive || isTrajectoriesFilterActive

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

  const filterVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  }
  const childrenVariants = {
    hidden: { opacity: 0, y: 5, transition: { duration: 0.2 } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    hovered: { scale: 0.95 },
  }

  console.timeEnd("Explorer Chart")

  return (
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
                      <CloseButton
                        isVisible={chipHoveredId === `${l.source.state}-${l.target.state}`}
                        onClick={() => toggleSelectedLumps(l)}
                      />
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
                    height: "65px",
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
                          />

                          <span>{id.id}</span>
                          <CloseButton
                            isVisible={chipHoveredId === id.id}
                            onClick={() => toggleSelectedTrajectory(id.id)}
                          />
                        </motion.div>
                      </div>
                    )
                  }}
                />
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
