import { useState, useEffect, useMemo, useRef } from "react"
import { includes, isNil, xor, uniq, flatten } from "lodash"
import { scaleLinear, scaleBand, max } from "d3"

import { ClearButton } from "../../common/Button/ClearButton"
import { Download, Shuffle, X } from "lucide-react"

import { AnimatePresence, motion } from "motion/react"

import { useModifierKey } from "../../hooks/useModifierKey"
import { useLongPressWithProgress } from "../../hooks/useLongPress"
import { useIsTouchDevice } from "../../hooks/useIsTouchDevice"

import Switch from "../../common/Switch/Switch"

import "./Silhouettes.css"

import { po } from "../../../utils/po"
import { scalePoint } from "d3"

import { getDominancePairsSelf } from "../../../utils/POHelperFunctions"

import { flattenDeep, groupBy } from "lodash"

import { Virtuoso } from "react-virtuoso"

import { downloadIDs } from "../../../utils/exportFunctions"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"

export const SilhouettesMorph = (props) => {
  const { silhouettes, idealSilhouettes, statesData } = useData()
  const { palette, statesOrder, setStatesOrder } = useViz()

  const statesNames = statesData.statesNames

  const {
    toggleSilhouetteFilter = () => {},
    setSelectedSilhouettes = () => {},
    selectedSilhouettes = [],
    isHasse,
    setIsHasse,
  } = props

  const isCmdPressed = useModifierKey("Meta")

  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [derivedSilhouettes, setDerivedSilhouettes] = useState(null)
  const [expandSides, setExpandSides] = useState(false)
  const [orderMode, setOrderMode] = useState(idealSilhouettes.length ? "distance" : "size")

  const containerRef = useRef()

  const w = 100, // Target R3F world width (10 units)
    h = 100 // Target R3F world height (10 units)
  const svgPadding = 10
  const isActive = selectedSilhouettes.length > 0

  const statesNamesLoaded = isNil(statesOrder) ? statesNames.sort() : statesOrder

  const y = scaleBand(statesNamesLoaded, [svgPadding, h - svgPadding]).padding(0)
  const x = scaleLinear(
    [0, max(silhouettes.map((d) => d.states.length - 1))],
    [svgPadding, w - svgPadding], // Map from the left side of the world to the right side
  )

  const animationDuration = silhouettes.length > 50 ? 0 : 0.2

  const orderedSilhouettes = useMemo(() => {
    switch (orderMode) {
      case "size":
        return [...silhouettes].sort((a, b) => b.size - a.size)
      case "distance":
        return [...silhouettes].sort((a, b) => b.levenshteinDistance - a.levenshteinDistance)
    }
  }, [silhouettes, orderMode])

  const deriveSilhouettesFromId = (id) => {
    // This function now only contains the core logic
    const next = silhouettes.filter((s) => s.name.includes(id) && s.name !== id)
    const previous = silhouettes.filter((s) => id.includes(s.name) && s.name !== id)
    const ds = { previous, next }
    setDerivedSilhouettes(ds)
  }

  const handleSilhouetteClick = (id) => {
    // e.stopPropagation()
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
      const hoveredItemName = silhouettes[hoveredIndex].name
      deriveSilhouettesFromId(hoveredItemName)
    }

    // 2. Add cleanup logic for when the effect should be reversed
    if (!isCmdPressed || hoveredIndex === null) {
      setDerivedSilhouettes(null)
      // setExpandSides(false)
    }
  }, [isCmdPressed, hoveredIndex, silhouettes]) // Dependencies: run when these values change

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
    hidden: { opacity: 0, transition: { duration: 1 } },
    visible: { opacity: 1, transition: { duration: 1 } },
  }

  const f = performance.now()
  // console.log(`Silhouette Morph in ${f - i} ms`)

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
        <ClearButton isActive={isActive} clearFunction={setSelectedSilhouettes}>
          Clear
        </ClearButton>
        <motion.div layout className="filter-bar padded">
          <AnimatePresence mode="popLayout">
            {selectedSilhouettes.map((s, _i) => {
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
        <AnimatePresence>
          {statesNamesLoaded.length > 0 && (
            <motion.section
              layoutScroll
              variants={chartVariants}
              style={{ overflowX: isHasse && "scroll" }}
              // initial="hidden"
              animate={"visible"}
              // exit="hidden"
            >
              {isHasse && (
                <MorphHasse
                  isHasse={isHasse}
                  silhouettes={silhouettes}
                  selectedSilhouettes={selectedSilhouettes}
                  toggleSilhouetteFilter={toggleSilhouetteFilter}
                  palette={palette}
                  x={x}
                  y={y}
                  statesNamesLoaded={statesNamesLoaded}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!isHasse && (
            <motion.div
              layoutScroll
              style={{
                top: 0,
                position: "absolute",
              }}
              variants={chartVariants}
              animate={"visible"}
              transition={{ delay: 1 }}
              className="filter-container silhouettes"
            >
              {/* <motion.div className="filter-bar"> */}
              <Virtuoso
                style={{
                  height: "100%",
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
                  const isSelected = includes(selectedSilhouettes, s.name)

                  const isCmdHovered = isCmdPressed && isHovered
                  const isSelectedExpand = expandSides && isSelected && isHovered

                  const isSideVisible = isCmdHovered || isSelectedExpand

                  const isExpandible = true

                  const opacity =
                    (isCmdPressed || expandSides) && hoveredIndex !== null && !isHovered ? 0.5 : 1

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
                        padding: isSideVisible ? "var(--spacing-xs)" : "0 16px 0 0",
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
                              selectedSilhouettes={selectedSilhouettes}
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
                            selectedSilhouettes={selectedSilhouettes}
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
              {/* </motion.div> */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

function SilhouetteCardMain({ s, i, ...props }) {
  const {
    palette,
    x,
    y,
    isSelected,
    handleSilhouetteClick,
    downloadIDs,
    isHovered,
    handleExpandClick,
    expandSides,
    isCmdPressed,
    isExpandible,
    handleLongPress,
    isHasse,
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

  // const inViewRef = useRef(null)
  const isInView = true
  // const isInView = useInView(inViewRef, { margin: "0px 200px 0px 200px" })

  const ids = s.trajectories.map((d) => d[0].id)

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
      {isInView && (
        <div className="card-btn-wrapper">
          {/* TODO In hover su typology mostra DW btn */}
          {s.trajectories[0].length !== 0 && isInView && (
            <button className="action-button download" onClick={(e) => downloadIDs(e, ids)}>
              <Download size={9} />
            </button>
          )}
          {/* TODO In hover su typology mostra DW btn */}
          <button className="action-button order" onClick={(e) => handleOrderClick(e, s)}>
            <Shuffle size={9} />
          </button>
        </div>
      )}

      {isInView && (
        <span className="typology-perc-text">
          {s.percentage > 1 ? s.percentage.toFixed(2) : s.percentage.toFixed(4)}%
        </span>
      )}

      {isInView && <span className="typology-perc-text">{s.size}</span>}
      {isInView && idealSilhouettes.length > 0 && (
        <span className="typology-perc-text">{s.levenshteinDistance.toFixed(2)}</span>
      )}

      {/* TODO Capire QUAL'é LA BEST MATCH */}
      {isInView && s.levenshteinDistance > 0.9 && <span className="top-banner">★</span>}

      <div className={`silhouette-wrapper `}>
        {isInView && (
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
        )}
      </div>
      <AnimatePresence>
        {isHovered && isSelected && !isCmdPressed && isExpandible && isInView && (
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
  const isInView = true
  // const isInView = useInView(viewRef, { margin: "50px 0px 50px 0px" })
  return (
    <motion.div
      key={`toggle-${silhouetteName}`}
      // ref={viewRef}
      className={`chip subset-chip ${isSelected ? "selected" : ""}`}
      whileTap={{ scale: 0.9 }}
      onClick={() => toggleSilhouetteFilter(silhouetteName)}
    >
      {isInView && (
        <SmallSilhouette silhouetteName={silhouetteName} palette={palette} x={x} y={y} />
      )}
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

export function SilhouettePathSvg({
  keyName = "",
  silhouetteName,
  palette,
  xScale,
  yScale,
  animationDuration = 0.2,
  strokeWidth = 5,
  isHasse,
  isChip = false,
}) {
  const size = isChip ? 32 : isHasse ? 30 : 64

  const svgVariants = {
    chip: { y: 0, width: size, height: size },
    hasse: { y: -size / 2, width: size, height: size },
    trajectory: { y: 0, width: size, height: size },
  }

  return (
    <motion.svg
      key={`${keyName}-${silhouetteName}`}
      className="silhouetteCanvas"
      variants={svgVariants}
      viewBox={"0 0 100 100"}
      width={size}
      height={size}
      x={-size / 2}
      initial={isChip ? "chip" : isHasse ? "hasse" : "trajectory"}
      animate={isChip ? "chip" : isHasse ? "hasse" : "trajectory"}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <g
        className="silhouetteGroup
    "
      >
        {silhouetteName.split("-").map((char, i, arr) => {
          const circleVariants = {
            hidden: { opacity: 0, r: 5, cx: xScale(i), cy: yScale(char), fill: palette[char] },
            trajectory: { opacity: 1, r: 5, cx: xScale(i), cy: yScale(char), fill: palette[char] },
            hasse: { opacity: 1, r: 9, cx: xScale(i), cy: yScale(char), fill: palette[char] },
          }
          return (
            <g key={`${keyName}-${silhouetteName}-${i}`}>
              <motion.circle
                variants={circleVariants}
                initial={"hidden"}
                animate={isHasse ? "hasse" : "trajectory"}
                transition={{
                  duration: animationDuration,
                  ease: "easeInOut",
                }}
                key={`circle-start-i${i}`}
                id={`circle-start-i${i}`}
                strokeWidth="1"
              />
              <motion.path
                initial={{ pathLength: 0, strokeWidth: 0, opacity: 0 }}
                animate={{ pathLength: 1, strokeWidth: strokeWidth, opacity: 0.5 }}
                transition={{
                  duration: animationDuration,
                  ease: "easeInOut",
                }}
                className="flow animated"
                d={`M ${xScale(i)} ${yScale(char)} L ${xScale(i + 1)} ${yScale(arr[i + 1])}`}
                stroke={palette[char]}
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )
        })}

        {silhouetteName.length === 1 && (
          <text x={35} y={65} fill="white" fontSize={50} fontWeight="bold">
            {silhouetteName}
          </text>
        )}
      </g>
      <title>{silhouetteName}</title>
    </motion.svg>
  )
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

const centerParentNodes = (parentName, poset) => {
  const children = poset.getCovering(parentName)
  if (!children || children.length === 0) return 0
  const childPositions = children.map((child) => poset.features[child].xPosition)
  return Math.min(...childPositions)
  return (Math.min(...childPositions) + Math.max(...childPositions)) / 2
}

// --- Custom Hook for Heavy Computations (Refactored) ---
const usePosetLayout = (
  silhouettes,
  width,
  height,
  rectWidth,
  rectHeight,
  padding,
  statesNamesLoaded,
  hoveredNode,
  isHasse,
) => {
  console.log(height)
  const paddingX = 80

  // Step 1: Memoize the expensive poset creation.
  // This only re-runs if the underlying silhouette data changes.ù
  const startTime = performance.now()
  const basePosetData = useMemo(() => {
    if (!silhouettes || silhouettes.length === 0 || !statesNamesLoaded) {
      return { poset: null, covers: [], leaves: [], orderedLeaves: [] }
    }

    const silhouetteNames = silhouettes.map((s) => s.name)
    // console.log("Silhouette Names:", silhouetteNames)
    const dominancePairs = getDominancePairsSelf(silhouetteNames)
    // console.log("Dominance Pairs:", dominancePairs)
    // const labels = [...new Set(dominancePairs.flat())]
    const pi = performance.now()

    const { matrix, nodes } = po.domFromEdges(dominancePairs)
    const poset = po.createPoset(matrix, nodes)
    poset.setLayers()
    poset.setDepth()
    // poset.color()
    poset
      .enrich()
      .feature("parents", (name) => poset.getCovered(name).map((parent) => poset.features[parent]))
      .feature("children", (name) => poset.getCovering(name).map((child) => poset.features[child]))
      .feature("i", (name) => poset.elements.indexOf(name))
      .feature("statesArray", (name) => name.split("-"))
      .feature("orderedName", (name) => {
        const states = name.split("-")
        // Ensure statesNamesLoaded is available before mapping
        if (statesNamesLoaded?.length > 0) {
          return states.map((s) => statesNamesLoaded.indexOf(s).toString()).join("-")
        }
        return name // Fallback
      })
    const pf = performance.now()
    console.log(`Poset Initialization took ${pf - pi} milliseconds`)

    const leaves = poset.layers[poset.layers.length - 1] || []

    const orderedLeaves = [...leaves].sort((a, b) => {
      // Use the 'orderedName' feature for sorting
      return poset.features[a].orderedName.localeCompare(poset.features[b].orderedName, "en", {
        numeric: true,
      })
    })

    const covers = poset.getCoverRelations()
    return { poset, covers, leaves, orderedLeaves, silhouetteNames }
  }, [silhouettes, statesNamesLoaded])

  const endTime = performance.now()

  console.log(`Call to create POSET took ${endTime - startTime} milliseconds`)

  // Step 2: Memoize the layout calculations.
  // This re-runs if the base poset, dimensions, or hoveredNode change.
  return useMemo(() => {
    const { poset, covers, leaves, orderedLeaves, silhouetteNames } = basePosetData
    if (!poset) return { poset: null, covers: [] }

    const layersByLength = Object.entries(
      groupBy(flattenDeep(poset.layers), (l) => l.split("-").length),
    )

    const namesForScale = isHasse ? orderedLeaves : silhouetteNames

    const xRange = isHasse
      ? [paddingX, width - padding]
      : [rectWidth / 2 + 1, width - rectWidth / 2 - 1]
    const yRange = isHasse ? [padding, height - padding] : [rectHeight / 2 + 1, rectHeight / 2 - 1]
    // --- Scales ---
    const xPointScale = scalePoint(namesForScale, xRange)
    const yScale = scaleLinear([1, layersByLength[layersByLength.length - 1][0]], yRange)

    poset.feature("yPositionScaled", (_name, d) => yScale(d.statesArray.length))
    !isHasse && poset.feature("xPosition", (name) => xPointScale(name))

    // --- Fisheye/Magnification Logic ---
    let siblingScale = null
    let leftScale = null
    let rightScale = null
    let focusX = null
    let siblingNames = []
    const segmentPadding = 20

    if (
      isHasse &&
      hoveredNode &&
      leaves.includes(hoveredNode.name) &&
      width / leaves.length < rectWidth
    ) {
      const parentName = poset.getCovered(hoveredNode.name)[0]
      const parent = poset.features[parentName]

      if (parent) {
        const siblings = parent.children
        focusX = xPointScale(hoveredNode.name)
        siblingNames = siblings.map((d) => d.name)
        const orderedSiblingNames = [...siblingNames].sort((a, b) => {
          return a.localeCompare(b, "en", { numeric: true })
        })

        const magnifiedGroupWidth = siblingNames.length * rectWidth
        const groupStart =
          focusX - magnifiedGroupWidth / 2 < padding ? padding : focusX - magnifiedGroupWidth / 2

        const groupEnd = groupStart + magnifiedGroupWidth

        siblingScale = scalePoint().domain(orderedSiblingNames).range([groupStart, groupEnd])
        leftScale = scaleLinear()
          .domain([padding, focusX])
          .range([padding, groupStart - segmentPadding])
        rightScale = scaleLinear()
          .domain([focusX, width - padding])
          .range([groupEnd + segmentPadding, width - padding])
      }
    }

    // --- X-Position Function ---
    const setXPosition = (name) => {
      if (siblingScale && leftScale && rightScale) {
        if (siblingNames.includes(name)) {
          return siblingScale(name)
        }
        const originalX = xPointScale(name)
        return originalX < focusX ? leftScale(originalX) : rightScale(originalX)
      }
      return xPointScale(name)
    }

    // --- Apply Positions ---
    isHasse &&
      poset.climber(function (layer, h) {
        layer.forEach((name) => {
          poset.features[name].xPosition =
            h === 0 ? setXPosition(name) : centerParentNodes(name, poset)
        })
      })

    return { poset, covers, yScale, layersByLength }
  }, [basePosetData, width, height, rectWidth, padding, hoveredNode, statesNamesLoaded, isHasse])
}

/**
 * Calculates node styles and labels based on the hovered node.
 * This is derived state, so useMemo is preferred over useEffect+useState.
 */
const useNodeStyling = (poset, hoveredNode) => {
  return useMemo(() => {
    const styles = {}
    const labels = {}
    if (!poset) return { styles, labels }

    if (hoveredNode) {
      // 1. Default dimmed state
      poset.elements.forEach((name) => {
        styles[name] = { opacity: 0.3, scale: 0.8 }
      })

      // 2. Recursive helper
      const styleRelatives = (node, relationship, level, visited) => {
        if (!node || visited.has(node.name)) return
        visited.add(node.name)

        styles[node.name] = {
          opacity: 1, // Keep relatives visible
          scale: Math.max(0.6, 1 - level * 0.1),
        }
        labels[node.name] = `${relationship} ${level}`

        const nextNodes = relationship === "Parent" ? node.parents : node.children
        nextNodes?.forEach((nextNode) => styleRelatives(nextNode, relationship, level + 1, visited))
      }

      // 3. Highlight hovered and relatives
      styles[hoveredNode.name] = { opacity: 1, scale: 1 }
      const visited = new Set([hoveredNode.name])
      hoveredNode.parents?.forEach((p) => styleRelatives(p, "Parent", 1, visited))
      hoveredNode.children?.forEach((c) => styleRelatives(c, "Child", 1, visited))

      // 4. Highlight siblings (from magnification logic)
      const parentName = poset.getCovered(hoveredNode.name)[0]
      const parent = poset.features[parentName]
      if (parent) {
        const siblings = parent.children
        const siblingNames = siblings.map((d) => d.name)
        siblingNames.forEach((name) => {
          // Only override if not the hovered node itself
          if (name !== hoveredNode.name) {
            styles[name] = { opacity: 1, scale: 1 }
          }
        })
      }
    } else {
      // 5. Reset all if no hover
      poset.elements.forEach((name) => {
        styles[name] = { opacity: 1, scale: 1 }
      })
    }

    return { styles, labels }
  }, [poset, hoveredNode])
}

function MorphHasse({
  isHasse,
  silhouettes,
  selectedSilhouettes,
  toggleSilhouetteFilter,
  palette,
  x,
  y,
  statesNamesLoaded,
}) {
  const i = performance.now()
  const [hoveredNode, setHoveredNode] = useState(null)
  const hoverTimeoutRef = useRef(null) // Add this line

  const handleMouseEnter = (node) => {
    // Clear any existing timeout (if user moves fast between nodes)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Set a new timeout to trigger the hover state after 100ms
    hoverTimeoutRef.current = setTimeout(() => {
      if (hoveredNode === null) setHoveredNode(node)
      if (hoveredNode) {
        const parentName = poset.getCovered(hoveredNode.name)[0]
        // console.log("Parent Name:", parentName)
        if (parentName) {
          const parent = poset.features[parentName]
          const siblings = parent.children
            .filter((child) => child.name !== hoveredNode.name)
            .map((d) => d.name)
          if (!siblings.includes(node.name)) setHoveredNode(node)
        }
      }
    }, 500)
  }

  const handleMouseLeave = () => {
    // Clear the pending timeout when the mouse leaves
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Set the hover state to null immediately
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null)
    }, 500)
  }

  const selectChildren = (nodeName) => {
    const children = poset.getCovering(nodeName)
    // console.log(children)
    toggleSilhouetteFilter(children)
  }

  const selectAllChildren = (nodeName) => {
    console.log("Select ALL children of", nodeName)
  }

  const rectWidth = isHasse ? 36 : 72
  const padding = isHasse ? 20 : 20
  const height = isHasse ? 500 : 100
  const width = isHasse
    ? Math.max(700, silhouettes.length * 10)
    : silhouettes.length * (rectWidth + 8) - 8

  const rectHeight = isHasse ? rectWidth : 91.5

  const startTime = performance.now()
  const { covers, poset, yScale, layersByLength } = usePosetLayout(
    silhouettes,
    width,
    height,
    rectWidth,
    rectHeight,
    padding,
    statesNamesLoaded,
    hoveredNode,
    isHasse,

    // hoverState // Unused
  )

  const endTime = performance.now()

  console.log(`Call to usePosetLayout took ${endTime - startTime} milliseconds`)

  // Calculate styles and labels using the custom hook
  const { styles, labels: nodeLabels } = useNodeStyling(poset, hoveredNode)

  // Determine rendering order: hovered node last (to be on top)
  const nodesForRender = useMemo(() => {
    if (!poset?.elements) return []
    const elementNames = [...poset.elements]
    if (!hoveredNode) return elementNames

    const idx = elementNames.findIndex((name) => name === hoveredNode.name)
    if (idx > -1) {
      const [nodeName] = elementNames.splice(idx, 1)
      elementNames.push(nodeName) // Add to the end, so it renders last
    }
    return elementNames
  }, [poset, hoveredNode])

  // Don't render anything until the poset is calculated
  if (!poset?.elements.length) return null

  const f = performance.now()
  console.log(`Morph Hasse rendered in ${f - i} ms`)

  return (
    <motion.svg
      initial={{ height: height, width: width }}
      animate={{ height: height, width: width }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* GRID */}
      {isHasse &&
        layersByLength.map(([key, value], i) => {
          const statesNumber = Number(key)
          const silhouettePerLayer = value.length

          return (
            <motion.g
              key={`grid-line-${key}`}
              initial={{
                y: yScale(statesNumber),
              }}
              animate={{
                y: yScale(statesNumber),
              }}
              transition={{ duration: 0.5, delay: 0.3 + 0.1 * i, ease: "easeInOut" }}
            >
              <motion.line
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { duration: 0.5, delay: 0.3 + 0.1 * i, ease: "easeInOut" },
                }}
                x1={0}
                x2={width}
                strokeWidth={0.5}
                stroke={"#717171aa"}
              />
              <motion.text
                initial={{ opacity: 0, y: 0 }}
                animate={{
                  opacity: 1,
                  y: -6,
                  transition: { duration: 0.3, delay: 0.3 + 0.1 * i, ease: "easeInOut" },
                }}
                fontSize={12}
                fill="var(--text-light)"
              >
                L{statesNumber}
              </motion.text>
              <motion.text
                initial={{ opacity: 0, y: 0 }}
                animate={{
                  opacity: 1,
                  y: 15,
                  transition: { duration: 0.3, delay: 0.3 + 0.1 * i, ease: "easeInOut" },
                }}
                fontSize={12}
                fill="var(--text-light)"
              >
                {silhouettePerLayer} lines
              </motion.text>
            </motion.g>
          )
        })}

      {/* Draw cover relations */}
      {isHasse &&
        covers.map((cover, i) => {
          const src = poset.features[cover.source]
          const tgt = poset.features[cover.target]

          if (!src || !tgt) return null

          const isSelected =
            selectedSilhouettes.includes(cover.source) && selectedSilhouettes.includes(cover.target)

          return (
            <motion.path
              key={`cover-${cover.source}-${cover.target}`}
              id={`cover-${cover.source}-${cover.target}`}
              initial={{
                pathLength: 0,
                d: `M${src.xPosition},${src.yPositionScaled} L${tgt.xPosition},${tgt.yPositionScaled}`,
              }} // Prevent initial animation
              animate={{
                pathLength: 1,
                d: `M${src.xPosition},${src.yPositionScaled} L${tgt.xPosition},${tgt.yPositionScaled}`,
                stroke: isSelected ? "#ccc" : palette[cover.source[cover.source.length - 1]],
                // stroke: isSelected ? "#ccc" : "#717171ff",
              }}
              exit={{ pathLength: 0 }}
              transition={{
                default: { duration: 0.2, ease: "easeInOut" },
                d: { duration: 0.8, ease: "easeInOut" },
                pathLength: { duration: isHasse ? 0.5 : 0, delay: 0.7 },
              }}
              strokeWidth={2}
              whileHover={{ strokeWidth: 6, cursor: "pointer" }}
              onClick={() => toggleSilhouetteFilter([cover.source, cover.target])}
            />
          )
        })}

      <g className="nodes">
        {nodesForRender.map((name) => {
          const node = poset.features[name]

          if (!node) return null // Safety check
          const isSelected = selectedSilhouettes.includes(name)
          const nodeStyle = styles[name] || { opacity: 1, scale: 1 }

          const isInFirstLayers = flatten(
            poset.layers.filter((l, i) => i < poset.layers.length - 1),
          ).includes(name)

          return (
            <motion.g
              key={`node-wrapper-${name}`}
              id={`node-wrapper-${name}`}
              initial={false}
              animate={{
                x: node.xPosition,
                y: isHasse ? node.yPositionScaled : rectHeight / 2 - 10,
                opacity: isHasse ? nodeStyle.opacity : 0,
                scale: nodeStyle.scale,
              }}
              transition={{
                default: { duration: 0.2, ease: "easeInOut" },
                x: { duration: 0.8, ease: "easeInOut" },
                y: { duration: 0.8, ease: "easeInOut" },
                opacity: { delay: isHasse ? 0 : 1.5 },
              }}
            >
              <motion.g
                onMouseEnter={() => handleMouseEnter(node)}
                onMouseLeave={handleMouseLeave}
                onClick={() => toggleSilhouetteFilter(name)}
                style={{ cursor: "pointer", zIndex: name === hoveredNode?.name ? 10 : 2 }}
                whileHover={{ scale: 1.1, opacity: 1 }}
              >
                {!isInFirstLayers && (
                  <motion.circle
                    initial={{
                      r: 0,
                      height: 10,
                    }}
                    animate={{
                      r: 5,
                      height: 10,
                    }}
                    transition={{
                      default: { duration: 0.2, ease: "easeInOut" },
                      r: { duration: 1 },
                      height: { duration: 1 },
                    }}
                    fill={palette[name[name.length - 1]] || "var(--surface-contrast)"}
                    // fill={"var(--surface-contrast)"}
                    // stroke={isSelected ? "var(--surface-accent)" : palette[name[0]] || "#ccc"}
                    // stroke={isSelected ? "var(--surface-accent)" : node.fill || "#ccc"}
                    // strokeWidth={isHasse ? (isSelected ? 2 : 0.5) : 0}
                    whileTap={{ scale: 0.95 }}
                  />
                )}
                <AnimatePresence>
                  {(isInFirstLayers || isSelected) && (
                    <motion.g
                      initial={{
                        y: isHasse ? 0 : -10,
                        scale: 0,
                      }}
                      animate={{ y: isHasse ? 0 : -10, scale: 1 }}
                      exit={{
                        scale: 0,
                      }}
                    >
                      <motion.rect
                        initial={{
                          width: rectWidth,
                          height: rectHeight,
                        }}
                        animate={{
                          width: rectWidth,
                          height: rectHeight,
                        }}
                        transition={{
                          default: { duration: 0.2, ease: "easeInOut" },
                          width: { duration: 1 },
                          height: { duration: 1 },
                        }}
                        x={-rectWidth / 2}
                        y={-rectWidth / 2}
                        fill={"var(--surface-contrast)"}
                        stroke={isSelected ? "var(--surface-accent)" : palette[name[0]] || "#ccc"}
                        // stroke={isSelected ? "var(--surface-accent)" : node.fill || "#ccc"}
                        strokeWidth={isHasse ? (isSelected ? 2 : 0.5) : 0}
                        rx={4}
                        ry={4}
                        whileTap={{ scale: 0.95 }}
                      />
                      <SilhouettePathSvg
                        keyName="hasse"
                        silhouetteName={name}
                        palette={palette}
                        animationDuration={0.2}
                        xScale={x}
                        yScale={y}
                        useAsSize={true}
                        isHasse={isHasse}
                      />
                      {/* <text fill="white" dominant-baseline="middle" text-anchor="middle">
                    {name}
                  </text> */}
                    </motion.g>
                  )}
                </AnimatePresence>
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  x={0}
                  y={-rectWidth / 2 - 5}
                  textAnchor="middle"
                  fill="var(--surface-accent)"
                  fontSize={10}
                  style={{ pointerEvents: "none" }}
                >
                  {nodeLabels[name] || ""}
                </motion.text>
              </motion.g>
              {isSelected && ( // TODO && has children
                <motion.g
                  transform={`translate(${-rectWidth}, ${-5})`}
                  onDoubleClick={() => selectAllChildren(name)}
                  onClick={() => selectChildren(name)}
                >
                  <rect width={10} height={10} rx={2} fill="white"></rect>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    x={5}
                    y={5}
                    fontSize={10}
                    fill="black"
                  >
                    v
                  </text>
                </motion.g>
              )}
              <title>{name}</title>
            </motion.g>
          )
        })}
      </g>
    </motion.svg>
  )
}
