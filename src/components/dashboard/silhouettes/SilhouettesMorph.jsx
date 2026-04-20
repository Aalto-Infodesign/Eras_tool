import { useState, useEffect, useMemo, useRef } from "react"
import { includes, isNil, xor, uniq } from "lodash"

import { SilhouettePathSvg } from "./shared/SilhouettePathSvg"
import { HasseDiagram } from "./Hasse/HasseDiagram"
import { ClearButton } from "../../common/Button/ClearButton"
import { Download, Shuffle, X } from "lucide-react"

import { AnimatePresence, motion, scale } from "motion/react"

import { useModifierKey } from "../../hooks/useModifierKey"
import { useLongPressWithProgress } from "../../hooks/useLongPress"
import { useIsTouchDevice } from "../../hooks/useIsTouchDevice"

import "./Silhouettes.css"

import { Virtuoso } from "react-virtuoso"

import { downloadIDs } from "../../../utils/exportFunctions"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { usePosetWorker } from "./hooks/usePosetWorker"
import Button from "../../common/Button/Button"
import { ShortcutSpan } from "../../common/ShortcutSpan/ShortcutSpan"
import { CloseButton } from "../../common/Button/CloseButton"
import { features } from "../../../config/features"

// ! TODO Refactor completo

export const SilhouettesMorph = () => {
  const { idealSilhouettes, statesOrder, setStatesOrder } = useData()
  const { isHasse, setIsHasse } = useViz()
  const {
    filtersActive,
    toggleSilhouetteFilter,
    setSelectedSilhouettesNames,
    selectedSilhouettesNames,
  } = useFilters()

  const { completeSilhouettes } = useDerivedData()

  const posetData = usePosetWorker().result

  const isCmdPressed = useModifierKey("Meta")

  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [derivedSilhouettes, setDerivedSilhouettes] = useState(null)
  const [expandSides, setExpandSides] = useState(false)
  const [orderMode, setOrderMode] = useState(idealSilhouettes.length ? "distance" : "size")

  const containerRef = useRef()

  const isActive = selectedSilhouettesNames.length > 0

  const animationDuration = completeSilhouettes.length > 50 ? 0 : 0.2

  const orderedSilhouettes = useMemo(() => {
    // console.log("CS", completeSilhouettes)
    const sorted = [...completeSilhouettes].sort((a, b) => {
      if (a.isFiltered !== b.isFiltered) return a.isFiltered ? -1 : 1
      const aData = a.filtered ?? a
      const bData = b.filtered ?? b

      switch (orderMode) {
        case "size":
          return bData.size - aData.size
        case "distance":
          return bData.levenshteinDistance - aData.levenshteinDistance
        default:
          return 0
      }
    })

    return sorted
  }, [completeSilhouettes, orderMode])

  const deriveSilhouettesFromId = (id) => {
    // This function now only contains the core logic
    const next = completeSilhouettes.filter((s) => s.name.includes(id) && s.name !== id)
    const previous = completeSilhouettes.filter((s) => id.includes(s.name) && s.name !== id)
    const ds = { previous, next }
    setDerivedSilhouettes(ds)
  }

  const handleSilhouetteClick = (id) => {
    toggleSilhouetteFilter(id)
  }

  const handleExpandClick = (e, id) => {
    e.stopPropagation()
    setExpandSides(!expandSides)
    deriveSilhouettesFromId(id)
  }

  const handleLongPress = (id) => {
    setExpandSides(!expandSides)
    deriveSilhouettesFromId(id)
  }

  const handleOrderClick = (e, s) => {
    e.stopPropagation()

    const newOrder = uniq(s.name.split("-"))
    const leftOut = xor(statesOrder, newOrder)

    newOrder.push(...leftOut)

    setStatesOrder(newOrder)
  }

  // 1. Use useEffect to react to state changes
  useEffect(() => {
    // If Cmd is pressed or expandSides is true, and an item is being hovered...
    if (isCmdPressed && hoveredIndex !== null) {
      // Get the name/id of the currently hovered item
      const hoveredItemName = completeSilhouettes[hoveredIndex].name
      deriveSilhouettesFromId(hoveredItemName)
    }

    // 2. Add cleanup logic for when the effect should be reversed
    if (!isCmdPressed || hoveredIndex === null) {
      setDerivedSilhouettes(null)
      // setExpandSides(false)
    }
  }, [isCmdPressed, hoveredIndex, completeSilhouettes]) // Dependencies: run when these values change

  const boxVariants = {
    hidden: { opacity: 0 },
    hasse: {
      width: "100%",
      opacity: 1,
      x: 0,
      transition: { default: { ease: "easeInOut", when: "beforeChildren" }, width: { delay: 0.1 } },
    },
    trajectories: {
      width: "85%",
      opacity: 1,
      x: 0,

      transition: { default: { ease: "easeInOut", when: "afterChildren" }, width: { delay: 0 } },
    },
  }

  const chartVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
  }

  return (
    <motion.section
      key={"silhouettes"}
      ref={containerRef}
      layout
      layoutId="silhouettes"
      className="bento-item silhouettes"
      variants={boxVariants}
      initial={"hidden"}
      animate={isHasse ? "hasse" : "trajectories"}
    >
      <motion.div layout>
        <h3>Silhouettes filters</h3>

        <div id="silhouettes-header">
          <div id="header-labels">
            <p>Chart mode</p>
            {idealSilhouettes.length > 0 && <p>Order by</p>}
            <p>Quick select</p>
          </div>
          <div id="header-content">
            <div className="chart-modes">
              <Button
                size="xs"
                keystroke="l"
                onClick={() => setIsHasse(false)}
                data-selected={!isHasse}
                tooltip={"All the Silhouettes in a ordered list"}
              >
                <p>
                  <ShortcutSpan>L</ShortcutSpan>ist
                </p>
              </Button>
              {features.hasseDiagram && (
                <Button
                  size="xs"
                  keystroke="t"
                  onClick={() => setIsHasse(true)}
                  data-selected={isHasse}
                  disabled={!posetData}
                  tooltip={"Tree map showing the relations and evolution of the Silhouettes"}
                >
                  <p>
                    {!posetData ? (
                      <span>Loading...</span>
                    ) : (
                      <span>
                        <ShortcutSpan>T</ShortcutSpan>
                        ree
                      </span>
                    )}
                  </p>
                </Button>
              )}
            </div>
            {/* <Switch toggleFunction={setIsHasse} labelOn="Hasse" labelOff="Trajectories" /> */}
            {idealSilhouettes.length > 0 && (
              <div id="order-dropdown">
                <select value={orderMode} onChange={(e) => setOrderMode(e.target.value)}>
                  <option value="size">Size</option>
                  <option value="distance">Distance</option>
                </select>
              </div>
            )}

            <div id="selection-presets">
              {/* <p>Selection Presets</p> */}

              {idealSilhouettes.length > 0 && (
                <Button size="xs" onClick={() => {}} data-selected={false}>
                  <p>Matching Expectations</p>
                </Button>
              )}
              <Button size="xs" onClick={() => {}} data-selected={false}>
                <p>None</p>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div key={"filter-container"} className="filter-container">
        <ClearButton
          key={"clear-btn"}
          isActive={isActive}
          clearFunction={setSelectedSilhouettesNames}
        >
          Clear
        </ClearButton>
        <motion.div layout className="filter-bar padded">
          <AnimatePresence mode="popLayout">
            {selectedSilhouettesNames.map((s, _i) => {
              return (
                <SilhouetteChip
                  key={s}
                  s={s}
                  animationDuration={animationDuration}
                  toggleSilhouetteFilter={toggleSilhouetteFilter}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <motion.div key="silhouettes-main" className="silhouettes-main" layout>
        <AnimatePresence mode="popLayout">
          {features.hasseDiagram && isHasse ? (
            <motion.section
              layout
              key="hasse-wrapper"
              variants={chartVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ overflowX: "scroll" }}
            >
              {posetData ? (
                <HasseDiagram
                  posetData={posetData}
                  selectedSilhouettes={selectedSilhouettesNames}
                  toggleSilhouetteFilter={toggleSilhouetteFilter}
                  statesNamesLoaded={statesOrder}
                />
              ) : (
                <p>Loading...</p>
              )}
            </motion.section>
          ) : (
            <motion.section
              layout
              key="scroller-wrapper"
              variants={chartVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="filter-container silhouettes"
            >
              <Virtuoso
                style={{
                  height: "150px",
                  maxHeight: "150px",
                  width: "100%",
                  paddingLeft: "10px",
                  // paddingBottom: "10px",
                  display: "flex",
                  alignItems: "end",

                  overflowX: "scroll",
                  overflowY: "hidden",
                }}
                data={orderedSilhouettes}
                horizontalDirection
                increaseViewportBy={100}
                itemContent={(i, s) => {
                  const isHovered = hoveredIndex === i
                  const isSelected = includes(selectedSilhouettesNames, s.name)

                  const isCmdHovered = isCmdPressed && isHovered
                  const isSelectedExpand = expandSides && isSelected && isHovered

                  const isSideVisible = isCmdHovered || isSelectedExpand

                  const isExpandible = true

                  const opacity = !filtersActive
                    ? 1
                    : s.isFiltered
                      ? (isCmdPressed || expandSides) && hoveredIndex !== null && !isHovered
                        ? 0.5
                        : 1
                      : 0.5

                  const cardVariants = {
                    hidden: { opacity: 1, scale: 1 },
                    visible: {
                      scale: 1,
                      opacity: opacity,
                      // gap: isSideVisible ? "var(--spacing-xs)" : 0,
                      transition: {
                        opacity: { duration: 0.2 },
                      },
                    },
                    hover: {
                      backgroundColor: "var(--surface-primary)",
                    },
                  }

                  const templateVariants = {
                    hidden: {
                      visibility: "hidden",
                      opacity: 0,
                      height: 0,
                      transition: { duration: 0.15 },
                    },
                    hover: {
                      visibility: "visible",
                      opacity: 1,
                      height: "auto",
                      transition: { duration: 0.15 },
                    },
                  }

                  const ids = s.trajectories.map((d) => d[0]?.id ?? "id not found")
                  return (
                    <motion.div
                      key={`card-${s.name}-${i}`}
                      className="silhouette-card"
                      variants={cardVariants}
                      initial={"hidden"}
                      animate={"hidden"}
                      whileHover={"hover"}
                      // animate={isHasse ? "hidden" : "visible"}
                      exit={"hidden"}
                      // exit={{ opacity: 0, scale: 0.5, transition: { duration: 1 } }}
                      // whileHover={{
                      //   backgroundColor: isSideVisible ? "var(--surface-tertiary)" : "none",
                      //   // padding: isSideVisible ? "var(--spacing-xs)" : "0 16px 0 0",
                      // }}
                      // whileTap={{ scale: !isCmdPressed || !expandSides ? 0.95 : 1 }}
                      onHoverStart={() => setHoveredIndex(i)}
                      onHoverEnd={() => {
                        setHoveredIndex(null)
                        setExpandSides(false)
                      }}
                    >
                      <AnimatePresence>
                        <motion.div className="card-btn-wrapper" variants={templateVariants}>
                          {/* TODO In hover su typology mostra DW btn */}
                          {s.trajectories[0].length !== 0 && (
                            <Button
                              size="xs"
                              variant="secondary"
                              className="download"
                              tooltip={"Export IDs"}
                              whileHover={{ scale: 1.2 }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => downloadIDs(e, ids)}
                            >
                              <Download size={9} />
                            </Button>
                          )}
                          {/* TODO In hover su typology mostra DW btn */}
                          <Button
                            size="xs"
                            variant="secondary"
                            className="order"
                            tooltip={"Order states"}
                            whileHover={{ scale: 1.2 }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => handleOrderClick(e, s)}
                          >
                            <Shuffle size={9} />
                          </Button>
                        </motion.div>
                      </AnimatePresence>

                      <div>
                        {/* <AnimatePresence>
                          {Array.isArray(derivedSilhouettes?.previous) &&
                            derivedSilhouettes.previous.length > 0 &&
                            isSideVisible && (
                              <SubsetSelection
                                subset={derivedSilhouettes.previous}
                                selectedSilhouettes={selectedSilhouettesNames}
                                toggleSilhouetteFilter={toggleSilhouetteFilter}
                                animationDuration={animationDuration}
                              />
                            )}
                        </AnimatePresence> */}

                        <SilhouetteCardMain
                          s={s}
                          i={i}
                          animationDuration={animationDuration}
                          isSelected={isSelected}
                          handleSilhouetteClick={handleSilhouetteClick}
                          downloadIDs={downloadIDs}
                          isHovered={isHovered}
                          handleExpandClick={handleExpandClick}
                          expandSides={expandSides}
                          isCmdPressed={isCmdPressed}
                          isExpandible={isExpandible}
                          handleLongPress={handleLongPress}
                          isHasse={isHasse}
                          handleOrderClick={handleOrderClick}
                          idealSilhouettes={idealSilhouettes}
                        />

                        {/* <AnimatePresence>
                          {derivedSilhouettes?.next.length > 0 && isSideVisible && (
                            <SubsetSelection
                              subset={derivedSilhouettes.next}
                              selectedSilhouettes={selectedSilhouettesNames}
                              toggleSilhouetteFilter={toggleSilhouetteFilter}
                              animationDuration={animationDuration}
                            />
                          )}
                        </AnimatePresence> */}
                      </div>
                    </motion.div>
                  )
                }}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  )
}

function SilhouetteCardMain({ s, i, ...props }) {
  const {
    isSelected,
    handleSilhouetteClick,
    downloadIDs,
    isHovered,

    isCmdPressed,
    isExpandible,
    handleLongPress,

    animationDuration,
    handleOrderClick,
    idealSilhouettes,
  } = props

  const isTouchDevice = useIsTouchDevice()

  const longPressProps = useLongPressWithProgress({
    onLongPress: () => {
      isTouchDevice && handleLongPress(s.name)
    },
    onClick: () => isTouchDevice && handleSilhouetteClick(s.name),
    threshold: 500,
    onProgress: (progress) => {},
  })

  const handleCardClick = () => {
    !isTouchDevice && handleSilhouetteClick(s.name)
  }

  const cardVariants = {
    hidden: { opacity: 1, y: 0 },
    // hidden: { opacity: 1, y: 5 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: animationDuration,
        delay: isCmdPressed || animationDuration === 0 ? 0 : 1 + i * 0.04,
        ease: "easeInOut",
      },
    }),
    tapped: { scale: 0.96, transition: { duration: 0.2 } },
  }

  const showFilterLabel = s.isFiltered && s.percentage !== s.filtered.percentage

  return (
    <motion.div
      key={`typology-card-${s.name}-${i}`}
      custom={i}
      variants={cardVariants}
      initial={"hidden"}
      animate={"visible"}
      exit={"hidden"}
      className={`typology
                      ${isSelected ? "selected" : ""}`}
      whileTap={"tapped"}
      onClick={handleCardClick}
      {...longPressProps}
      // ref={inViewRef}
    >
      <span className="typology-perc-wrapper">
        <span className={`typology-perc-text ${showFilterLabel && "filtered"}`}>
          {s.percentage > 1
            ? s.percentage.toFixed(showFilterLabel ? 1 : 2)
            : s.percentage.toFixed(2)}
          %
        </span>

        {showFilterLabel && (
          <span className="typology-perc-text">{s.filtered.percentage.toFixed(2)}%</span>
        )}
      </span>

      <span className="typology-perc-wrapper">
        <span className={`typology-perc-text ${showFilterLabel && "filtered"}`}>
          {s.size > 1 ? s.size : s.size}
        </span>

        {showFilterLabel && (
          <span className="typology-perc-text">
            {s.filtered.size > 1 ? s.filtered.size : s.filtered.size}
          </span>
        )}
      </span>

      {idealSilhouettes.length > 0 && (
        <span className="typology-perc-text">{s.levenshteinDistance.toFixed(2)}</span>
      )}

      {/* TODO Capire QUAL'é LA BEST MATCH */}
      {s.levenshteinDistance > 0.9 && <span className="top-banner">★</span>}

      <div className={`silhouette-wrapper `}>
        <SilhouettePathSvg
          keyName="card"
          silhouetteName={s.name}
          animationDuration={0.2}
          useAsSize={true}
          strokeWidth={9}
          radius={9}
        />
      </div>
      {/* <AnimatePresence>
        {isHovered && isSelected && !isCmdPressed && isExpandible && (
          <div className="expand">
            <AnimatePresence>
              {isTouchDevice && longPressProps?.isPressed && (
                <motion.div
                  className="progress-bar"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.round(longPressProps.progress * 4)}rem`,
                    transition: { duration: 0.1 },
                  }}
                  exit={{ width: 0 }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    backgroundColor: "white",
                    opacity: 0.25,
                  }}
                />
              )}
            </AnimatePresence>
            <motion.button
              className="btn"
              onClick={(e) => handleExpandClick(e, s.name)}
              whileTap={{ scale: 0.9, transition: { duration: 0.2, delay: 0 } }}
            >
              {expandSides ? "Hide" : "Expand"}
            </motion.button>
          </div>
        )}
      </AnimatePresence> */}
    </motion.div>
  )
}

export function SubsetSelection({ subset, selectedSilhouettes, toggleSilhouetteFilter }) {
  const subsetNames = subset.map((s) => s.name)

  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "2rem" }}
      exit={{ opacity: 0, width: 0 }}
      className="subset-selection"
    >
      <div
        className="selection-container"
        style={{ display: "flex", flexDirection: "column", gap: "2px" }}
      >
        {subsetNames.map((s, i) => {
          const isSelected = includes(selectedSilhouettes, s)
          return (
            <SilhouetteToggleButton
              silhouetteName={s}
              isSelected={isSelected}
              toggleSilhouetteFilter={toggleSilhouetteFilter}
            />
          )
        })}
      </div>
    </motion.div>
  )
}

export function SilhouetteToggleButton({ silhouetteName, isSelected, toggleSilhouetteFilter }) {
  // const viewRef = useRef(null)
  return (
    <motion.div
      key={`toggle-${silhouetteName}`}
      // ref={viewRef}
      className={`chip subset-chip ${isSelected ? "selected" : ""}`}
      whileTap={{ scale: 0.9 }}
      onClick={() => toggleSilhouetteFilter(silhouetteName)}
    >
      <SmallSilhouette silhouetteName={silhouetteName} />
    </motion.div>
  )
}

export function SmallSilhouette({ silhouetteName }) {
  if (silhouetteName.length > 1)
    return (
      <motion.div layout transition={{ duration: 0.2 }} className="chip-svg-wrapper">
        <SilhouettePathSvg keyName="chip" silhouetteName={silhouetteName} isChip={true} />
      </motion.div>
    )
  else return <span>{silhouetteName}</span>
}

const chipVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
}

function SilhouetteChip({ s, animationDuration, toggleSilhouetteFilter }) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <motion.div
      variants={chipVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      whileHover="hover"
      transition={{ duration: 0.2 }}
      layout
      className="chip silhouette-chip"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <CloseButton isVisible={isHovered} onClick={() => toggleSilhouetteFilter(s)} />

      <SmallSilhouette silhouetteName={s} animationDuration={animationDuration} />
    </motion.div>
  )
}
