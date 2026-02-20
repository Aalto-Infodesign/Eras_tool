import { useState, useEffect, useMemo, useRef } from "react"
import { includes, isNil, xor, uniq } from "lodash"
import { scaleLinear, scaleBand, max } from "d3"

import { SilhouettePathSvg } from "./shared/SilhouettePathSvg"
import { HasseDiagram } from "./Hasse/HasseDiagram"
import { ClearButton } from "../../common/Button/ClearButton"
import { Download, Shuffle, X } from "lucide-react"

import { AnimatePresence, motion } from "motion/react"

import { useModifierKey } from "../../hooks/useModifierKey"
import { useLongPressWithProgress } from "../../hooks/useLongPress"
import { useIsTouchDevice } from "../../hooks/useIsTouchDevice"

import Switch from "../../common/Switch/Switch"

import "./Silhouettes.css"

import { Virtuoso } from "react-virtuoso"

import { downloadIDs } from "../../../utils/exportFunctions"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"
import { useSilhouettesPoset } from "./hooks/usePosetLayout"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"

// ! TODO Refactor completo

export const SilhouettesMorph = () => {
  const { idealSilhouettes, statesData } = useData()
  const { palette, statesOrder, setStatesOrder, isHasse, setIsHasse } = useViz()
  const { toggleSilhouetteFilter, setSelectedSilhouettesNames, selectedSilhouettesNames } =
    useFilters()

  const { completeSilhouettes } = useDerivedData()

  const statesNames = statesData.statesNames
  const statesNamesLoaded = isNil(statesOrder) ? statesNames.sort() : statesOrder

  const basePosetData = useSilhouettesPoset(statesNamesLoaded, completeSilhouettes)

  const isCmdPressed = useModifierKey("Meta")

  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [derivedSilhouettes, setDerivedSilhouettes] = useState(null)
  const [expandSides, setExpandSides] = useState(false)
  const [orderMode, setOrderMode] = useState(idealSilhouettes.length ? "distance" : "size")

  const containerRef = useRef()

  const w = 100, // Target R3F world width (10 units)
    h = 100 // Target R3F world height (10 units)
  const svgPadding = 10
  const isActive = selectedSilhouettesNames.length > 0

  const y = scaleBand(statesNamesLoaded, [svgPadding, h - svgPadding]).padding(0)
  const x = scaleLinear(
    [0, max(completeSilhouettes.map((d) => d.states.length - 1))],
    [svgPadding, w - svgPadding], // Map from the left side of the world to the right side
  )

  const animationDuration = completeSilhouettes.length > 50 ? 0 : 0.2

  const orderedSilhouettes = useMemo(() => {
    const sorted = [...completeSilhouettes].sort((a, b) => {
      // Filtered items always float to the top
      if (a.isFiltered !== b.isFiltered) return a.isFiltered ? -1 : 1
      const aData = a.isFiltered ? a.filtered : a
      const bData = b.isFiltered ? b.filtered : b

      switch (orderMode) {
        case "size":
          return bData.size - aData.size
        case "distance":
          return bData.levenshteinDistance - aData.levenshteinDistance
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
    // e.stopPropagation()
    console.log("Click")
    toggleSilhouetteFilter(id)
  }

  const handleExpandClick = (e, id) => {
    e.stopPropagation()
    setExpandSides(!expandSides)
    deriveSilhouettesFromId(id)
  }

  const handleLongPress = (id) => {
    // toggleSilhouetteFilter(id)
    setExpandSides(!expandSides)
    deriveSilhouettesFromId(id)
  }

  const handleOrderClick = (e, s) => {
    e.stopPropagation()
    // console.log(statesOrder)
    // console.log(s.name)
    const newOrder = uniq(s.name.split("-"))
    const leftOut = xor(statesOrder, newOrder)

    // const filteredLeftOut = leftOut.filter((d) => !statesOrder.includes(d))
    // console.log(filteredLeftOut)

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

  // console.log(statesNamesLoaded)

  const boxVariants = {
    hidden: { opacity: 0, x: -10 },
    hasse: {
      width: "100%",
      opacity: 1,
      x: 0,
      transition: { default: { ease: "easeInOut", when: "beforeChildren" }, width: { delay: 0.5 } },
    },
    trajectories: {
      width: "85%",
      opacity: 1,
      x: 0,

      transition: { default: { ease: "easeInOut", when: "afterChildren" }, width: { delay: 1 } },
    },
  }

  const chartVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
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
        <div className="header-section">
          <Switch toggleFunction={setIsHasse} labelOn="Hasse" labelOff="Trajectories" />
          {idealSilhouettes.length > 0 && (
            <div className="order-dropdown">
              <select value={orderMode} onChange={(e) => setOrderMode(e.target.value)}>
                <option value="size">Size</option>
                <option value="distance">Distance</option>
              </select>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div className="filter-container">
        <ClearButton isActive={isActive} clearFunction={setSelectedSilhouettesNames}>
          Clear
        </ClearButton>
        <motion.div layout className="filter-bar padded">
          <AnimatePresence mode="popLayout">
            {selectedSilhouettesNames.map((s, _i) => {
              return (
                <SilhouetteChip
                  key={s}
                  s={s}
                  palette={palette}
                  x={x}
                  y={y}
                  animationDuration={animationDuration}
                  toggleSilhouetteFilter={toggleSilhouetteFilter}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <div
        style={{
          position: "relative",
        }}
      >
        <AnimatePresence mode="popLayout">
          {isHasse ? (
            <motion.section
              layout
              key="hasse-wrapper"
              variants={chartVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ overflowX: "scroll" }}
            >
              <HasseDiagram
                isHasse={isHasse}
                selectedSilhouettes={selectedSilhouettesNames}
                toggleSilhouetteFilter={toggleSilhouetteFilter}
                x={x}
                y={y}
                basePosetData={basePosetData}
              />
            </motion.section>
          ) : (
            <motion.div
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
                  height: "100%",
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

                  const opacity = s.isFiltered
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
                  }
                  return (
                    <motion.div
                      key={`card-${s.name}-${i}`}
                      className="silhouette-card"
                      variants={cardVariants}
                      initial={"hidden"}
                      animate={isHasse ? "hidden" : "visible"}
                      exit={"hidden"}
                      // exit={{ opacity: 0, scale: 0.5, transition: { duration: 1 } }}
                      whileHover={{
                        backgroundColor: isSideVisible ? "var(--surface-light)" : "none",
                        // padding: isSideVisible ? "var(--spacing-xs)" : "0 16px 0 0",
                      }}
                      // whileTap={{ scale: !isCmdPressed || !expandSides ? 0.95 : 1 }}
                      onHoverStart={() => setHoveredIndex(i)}
                      onHoverEnd={() => {
                        setHoveredIndex(null)
                        setExpandSides(false)
                      }}
                    >
                      <AnimatePresence>
                        {Array.isArray(derivedSilhouettes?.previous) &&
                          derivedSilhouettes.previous.length > 0 &&
                          isSideVisible && (
                            <SubsetSelection
                              subset={derivedSilhouettes.previous}
                              selectedSilhouettes={selectedSilhouettesNames}
                              toggleSilhouetteFilter={toggleSilhouetteFilter}
                              x={x}
                              y={y}
                              palette={palette}
                              animationDuration={animationDuration}
                            />
                          )}
                      </AnimatePresence>

                      <SilhouetteCardMain
                        s={s}
                        i={i}
                        x={x}
                        y={y}
                        palette={palette}
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

                      <AnimatePresence>
                        {derivedSilhouettes?.next.length > 0 && isSideVisible && (
                          <SubsetSelection
                            subset={derivedSilhouettes.next}
                            selectedSilhouettes={selectedSilhouettesNames}
                            toggleSilhouetteFilter={toggleSilhouetteFilter}
                            palette={palette}
                            x={x}
                            y={y}
                            animationDuration={animationDuration}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

function SilhouetteCardMain({ s, i, ...props }) {
  const {
    x,
    y,
    isSelected,
    handleSilhouetteClick,
    downloadIDs,
    isHovered,

    isCmdPressed,
    isExpandible,
    handleLongPress,
    isHasse,
    animationDuration,
    handleOrderClick,
    idealSilhouettes,
  } = props

  const { palette } = useViz()
  const isTouchDevice = useIsTouchDevice()

  const longPressProps = useLongPressWithProgress({
    onLongPress: () => {
      isTouchDevice && handleLongPress(s.name)
    },
    onClick: () => isTouchDevice && handleSilhouetteClick(s.name),
    threshold: 500,
    onProgress: (progress) => {
      // Optional: You can use this for visual feedback
      // console.log(`Long press progress: ${Math.round(progress * 100)}%`)
    },
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
    tapped: { scale: 0.95, transition: { duration: 0.2 } },
  }

  const ids = s.trajectories.map((d) => d[0].id)

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
      <div className="card-btn-wrapper">
        {/* TODO In hover su typology mostra DW btn */}
        {s.trajectories[0].length !== 0 && (
          <button className="action-button download" onClick={(e) => downloadIDs(e, ids)}>
            <Download size={9} />
          </button>
        )}
        {/* TODO In hover su typology mostra DW btn */}
        <button className="action-button order" onClick={(e) => handleOrderClick(e, s)}>
          <Shuffle size={9} />
        </button>
      </div>

      <span className="typology-perc-wrapper">
        <span className={`typology-perc-text ${showFilterLabel && "filtered"}`}>
          {s.percentage > 1
            ? s.percentage.toFixed(showFilterLabel ? 1 : 2)
            : s.percentage.toFixed(showFilterLabel ? 4 : 2)}
          %
        </span>

        {showFilterLabel && (
          <span className="typology-perc-text">
            {s.filtered.percentage > 1
              ? s.filtered.percentage.toFixed(2)
              : s.filtered.percentage.toFixed(4)}
            %
          </span>
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
          palette={palette}
          xScale={x}
          yScale={y}
          animationDuration={0.2}
          useAsSize={true}
          strokeWidth={9}
          radius={9}
          isHasse={isHasse}
        />
      </div>
      <AnimatePresence>
        {isHovered && isSelected && !isCmdPressed && isExpandible && (
          <div className="action-button expand">
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
            {/* <motion.button
              className="btn"
              onClick={(e) => handleExpandClick(e, s.name)}
              whileTap={{ scale: 0.9, transition: { duration: 0.2, delay: 0 } }}
            >
              {expandSides ? "Hide" : "Expand"}
            </motion.button> */}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function SubsetSelection({
  subset,
  selectedSilhouettes,
  toggleSilhouetteFilter,
  palette,
  x,
  y,
}) {
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
              x={x}
              y={y}
              palette={palette}
            />
          )
        })}
      </div>
    </motion.div>
  )
}

export function SilhouetteToggleButton({
  silhouetteName,
  isSelected,
  toggleSilhouetteFilter,
  x,
  y,
  palette,
}) {
  // const viewRef = useRef(null)
  return (
    <motion.div
      key={`toggle-${silhouetteName}`}
      // ref={viewRef}
      className={`chip subset-chip ${isSelected ? "selected" : ""}`}
      whileTap={{ scale: 0.9 }}
      onClick={() => toggleSilhouetteFilter(silhouetteName)}
    >
      <SmallSilhouette silhouetteName={silhouetteName} palette={palette} x={x} y={y} />
    </motion.div>
  )
}

export function SmallSilhouette({ silhouetteName, palette, x, y }) {
  if (silhouetteName.length > 1)
    return (
      <motion.div layout transition={{ duration: 0.2 }} className="chip-svg-wrapper">
        <SilhouettePathSvg
          keyName="chip"
          silhouetteName={silhouetteName}
          palette={palette}
          xScale={x}
          yScale={y}
          isChip={true}
        />
      </motion.div>
    )
  else return <span>{silhouetteName}</span>
}

const chipVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
}
const buttonVariants = {
  visible: { opacity: 1, transition: { duration: 0.2 } },
  hidden: { opacity: 0, transition: { duration: 0.2 } },
}

const closeBtnVariants = {
  hidden: { scale: 0 },
  visible: { scale: 1, transition: { ease: "easeInOut" } },
}

function SilhouetteChip({ s, palette, x, y, animationDuration, toggleSilhouetteFilter }) {
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
      {/* {isHovered && (
        <motion.button
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          whileTap={{ scale: 0.9, transition: 0.2 }}
          className="close-button"
          onClick={() => toggleSilhouetteFilter(s)}
        >
          ×
        </motion.button>
      )} */}

      <motion.button
        className="close-btn"
        variants={closeBtnVariants}
        initial={"hidden"}
        animate={isHovered ? "visible" : "hidden"}
        layout
        onClick={() => toggleSilhouetteFilter(s)}
      >
        <X size={16} />
      </motion.button>
      <SmallSilhouette
        silhouetteName={s}
        palette={palette}
        x={x}
        y={y}
        animationDuration={animationDuration}
      />
    </motion.div>
  )
}
