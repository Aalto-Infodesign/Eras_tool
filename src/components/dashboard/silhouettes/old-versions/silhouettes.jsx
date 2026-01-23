import { useState, useEffect } from "react"
import { includes, isNil } from "lodash"
import { scaleLinear, scaleBand, max } from "d3"

import { ClearButton } from "../../../common/Button/ClearButton"
import { DownloadIcon } from "../../../common/icons/Icons"

import { AnimatePresence, motion } from "motion/react"

import { useModifierKey } from "../../../hooks/useModifierKey"
import { useLongPressWithProgress } from "../../../hooks/useLongPress"
import { useIsTouchDevice } from "../../../hooks/useIsTouchDevice"

import { SilhouettesHasse } from "./SilhouettesHasse"
import Switch from "../../../common/Switch/Switch"

import "../Silhouettes.css"

export const Silhouettes = (props) => {
  const TEST = 10

  const { statesNames } = props
  // const { x, y, silhouetteScale } = props.scales.silhouettes

  const {
    silhouettes = [], // Default to an empty array
    toggleSilhouetteFilter = () => {},
    setSelectedSilhouettes = () => {},
    selectedSilhouettes = [],
    palette = [], // Default palette to empty array
    isHasse,
    setIsHasse,
  } = props
  // const { ageRange, dateRange, quantilesNumber, stayLenQuants } = props.analytics
  const { statesOrder } = props

  // const isCmdPressed = true
  const isCmdPressed = useModifierKey("Meta")

  const [hoveredIndex, setHoveredIndex] = useState(null)

  const [derivedSilhouettes, setDerivedSilhouettes] = useState(null)
  const [expandSides, setExpandSides] = useState(false)
  // const [isSideVisible, setIsSideVisible] = useState(false)

  const w = 100, // Default width
    h = 100 // Default height

  const isActive = selectedSilhouettes.length > 0

  const statesNamesLoaded = isNil(statesOrder) ? statesNames.sort() : statesOrder

  const y = scaleBand(statesNamesLoaded, [0, h]).padding(1)
  const x = scaleLinear([0, max(silhouettes.map((d) => d.states.length - 1))], [10, w - 10])

  const animationDuration = 0.2
  // const animationDuration = 0.8 / statesNamesLoaded.length

  // console.log("States names loaded in silhouettes:", statesNamesLoaded)

  function downloadIDs(e, s) {
    e.stopPropagation()
    const ids = s.trajectories.map((d) => d[0].id)

    // Create the text content
    const textContent = ids.join("\n")

    // Create a blob with the text content
    const blob = new Blob([textContent], { type: "text/plain" })

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob)

    // Create a temporary anchor element and trigger download
    const a = document.createElement("a")
    a.href = url
    a.download = `ids_${new Date().toISOString().split("T")[0]}.txt` // adds date
    document.body.appendChild(a)
    a.click()

    // Clean up
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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

  const chartVariants = {
    hidden: { opacity: 0, transition: { duration: 0.2 } },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  }

  return (
    <motion.section
      key={"silhouettes"}
      layout
      className="bento-item silhouettes"
      style={{ gridColumn: isHasse ? "span 12" : "span 10" }}
      // transition={{ duration: 0.2 }}
    >
      <motion.div layout className="header-with-switch">
        <h3>Silhouettes filters</h3>
        <Switch toggleFunction={setIsHasse} labelOn="Hasse" labelOff="Trajectories" />
      </motion.div>

      <motion.div className="filter-container">
        <ClearButton isActive={isActive} clearFunction={setSelectedSilhouettes}>
          Clear
        </ClearButton>
        <div className="filter-bar">
          <AnimatePresence>
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
        </div>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {!isHasse && (
          <motion.div
            layout
            variants={chartVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="filter-container silhouettes"
          >
            <div className="filter-bar">
              {silhouettes.map((s, i) => {
                const isHovered = hoveredIndex === i
                const isSelected = includes(selectedSilhouettes, s.name)

                const isCmdHovered = isCmdPressed && isHovered
                const isSelectedExpand = expandSides && isSelected && isHovered

                const isSideVisible = isCmdHovered || isSelectedExpand

                const isExpandible = true

                const opacity =
                  (isCmdPressed || expandSides) && hoveredIndex !== null && !isHovered ? 0.5 : 1

                return (
                  <motion.div
                    key={i}
                    className="silhouette-card"
                    initial={{ opacity: 1 }}
                    animate={{
                      opacity: opacity,
                      gap: isSideVisible ? "var(--spacing-xs)" : 0,
                      transition: {
                        opacity: { duration: 0.2 },
                      },
                    }}
                    whileHover={{
                      backgroundColor: isSideVisible ? "var(--surface-light)" : "none",
                      padding: isSideVisible ? "var(--spacing-xs)" : "0",
                    }}
                    // whileTap={{ scale: !isCmdPressed || !expandSides ? 0.95 : 1 }}
                    onHoverStart={() => setHoveredIndex(i)}
                    onHoverEnd={() => {
                      setHoveredIndex(null)
                      setExpandSides(false)
                    }}
                  >
                    {/* <div>
                      <p style={{ color: "red" }}>{isSideVisible ? "true" : "false"}</p>
                      <p style={{ color: "red" }}>{JSON.stringify(derivedSilhouettes?.previous)}</p>
                    </div> */}
                    <AnimatePresence>
                      {Array.isArray(derivedSilhouettes?.previous) &&
                        derivedSilhouettes.previous.length > 0 &&
                        isSideVisible && (
                          <SubsetSelection
                            subset={derivedSilhouettes.previous}
                            isSelected={isSelected}
                            toggleSilhouetteFilter={toggleSilhouetteFilter}
                            x={x}
                            y={y}
                            palette={palette}
                            animationDuration={animationDuration}
                          />
                        )}
                    </AnimatePresence>

                    <SilhouetteTypologyCard
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
                    />

                    <AnimatePresence>
                      {derivedSilhouettes?.next.length > 0 && isSideVisible && (
                        <SubsetSelection
                          subset={derivedSilhouettes.next}
                          isSelected={isSelected}
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
              })}
            </div>
          </motion.div>
        )}

        {isHasse && statesNamesLoaded.length > 0 && (
          <motion.section
            layout
            variants={chartVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <SilhouettesHasse
              silhouettes={silhouettes}
              selectedSilhouettes={selectedSilhouettes}
              toggleSilhouetteFilter={toggleSilhouetteFilter}
              palette={palette}
              x={x}
              y={y}
              statesNamesLoaded={statesNamesLoaded}
              test={TEST}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function SilhouetteTypologyCard({ s, i, ...props }) {
  const {
    palette,
    x,
    y,
    animationDuration,
    isSelected,
    handleSilhouetteClick,
    downloadIDs,
    isHovered,
    handleExpandClick,
    expandSides,
    isCmdPressed,
    isExpandible,
    handleLongPress,
  } = props

  const isTouchDevice = useIsTouchDevice()

  const longPressProps = useLongPressWithProgress({
    onLongPress: () => {
      // console.log("Long Press")
      isTouchDevice && handleLongPress(s.name)
    },
    onClick: () => isTouchDevice && handleSilhouetteClick(s.name),
    threshold: 500,
    onProgress: (progress) => {
      // Optional: You can use this for visual feedback
      // console.log(`Long press progress: ${Math.round(progress * 100)}%`)
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{
        opacity: 1,

        y: 0,
        transition: { duration: 0.2, delay: 0.2 + i * 0.1, ease: "easeOut" },
      }}
      exit={{ opacity: 0, y: 5 }}
      className={`typology
                      ${isSelected ? "selected" : ""}`}
      onClick={(e) => !isTouchDevice && handleSilhouetteClick(s.name)}
      {...longPressProps}
      // whileHover={{ scale: 0.95 }}
      whileTap={{
        scale: 0.95,
        transition: { duration: 0.2 },
      }}
    >
      {/* TODO In hover su typology mostra DW btn */}
      {s.trajectories[0].length !== 0 && (
        <button className="action-button download" onClick={(e) => downloadIDs(e, s)}>
          <DownloadIcon size={10} />
        </button>
      )}

      <span className="typology-perc-text" y={130} x={0} fill="white">
        {s.percentage.toFixed(1)}%
      </span>
      <div className={`silhouette-wrapper `}>
        <svg className="silhouetteCanvas" viewBox="0 0 100 100">
          <g className="silhouetteGroup">
            <rect className="percBar animated" y={0} height={1} width={s.percentage} fill="white" />
            {s.trajectory
              .filter((s) => s.target !== "fs")
              .map((d, i) => {
                return (
                  <g key={i}>
                    <motion.circle
                      initial={{ r: 0, cx: x(i), cy: y(d.source), fill: palette[d.source] }}
                      animate={{ r: 3, cx: x(i), cy: y(d.source), fill: palette[d.source] }}
                      transition={{
                        duration: animationDuration,
                      }}
                      key={`circle-start-i${i}`}
                      id={`circle-start-i${i}`}
                      strokeWidth="1"
                      stroke="var(--surface-primary)"
                    />
                    <motion.path
                      key={i}
                      id={`sil-path-${d.source}-${d.target}`}
                      initial={{
                        pathLength: 0,
                        strokeWidth: 0,
                        d: `M ${x(i)} ${y(d.source)} L ${x(i + 1)} ${y(d.target)}`,
                      }}
                      animate={{
                        pathLength: 1,
                        strokeWidth: 3,
                        d: `M ${x(i)} ${y(d.source)} L ${x(i + 1)} ${y(d.target)}`,
                      }}
                      transition={{
                        duration: animationDuration,
                      }}
                      className="flow"
                      stroke={palette[d.source]}
                      strokeLinecap="round"
                    />

                    {i + 1 === s.trajectory.filter((s) => s.target !== "fs").length && (
                      <motion.circle
                        initial={{ r: 0, cx: x(i + 1), cy: y(d.target), fill: palette[d.target] }}
                        animate={{ r: 3, cx: x(i + 1), cy: y(d.target), fill: palette[d.target] }}
                        transition={{
                          duration: animationDuration,
                        }}
                        key={`circle-end-i${i}`}
                        id={`circle-end-i${i}`}
                        r={3}
                        strokeWidth="1"
                        stroke="var(--surface-primary)"
                      />
                    )}
                  </g>
                )
              })}
          </g>
          <title>{s.name}</title>

          {/* <text className="nameLabel" y={150} x={0} fill="white">
                  {s.name}
                </text> */}
        </svg>
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
                >
                  {/* TEST */}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              className="btn"
              // initial={{ opacity: 0, y: 5 }}
              // animate={{ opacity: 1, y: 0 }}
              // exit={{ opacity: 0, y: 5 }}

              onClick={(e) => handleExpandClick(e, s.name)}
              whileTap={{ scale: 0.9, transition: { duration: 0.2, delay: 0 } }}
              // onTap={(e) => e.stopPropagation()}
            >
              {expandSides ? "Hide" : "Expand"}
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SubsetSelection({
  subset,
  isSelected,
  toggleSilhouetteFilter,
  palette,
  x,
  y,
  animationDuration,
}) {
  const subsetNames = subset.map((s) => s.name)

  useEffect(() => {}, [subset])
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
          return (
            <motion.div
              key={s}
              className={`chip subset-chip ${isSelected ? "selected" : ""}`}
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleSilhouetteFilter(s)}
            >
              <SmallSilhouette
                silhouetteName={s}
                palette={palette}
                x={x}
                y={y}
                animationDuration={animationDuration}
              />
            </motion.div>

            /* <motion.div
                key={s}
                className={`chip subset-chip animated ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => toggleSilhouetteFilter(s)}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 0.95 }}
              >
                {s}
              </motion.div>*/
          )
        })}
      </div>
    </motion.div>
  )
}

function SmallSilhouette({ silhouetteName, palette, x, y, animationDuration }) {
  // useEffect(() => {
  //   console.log(silhouetteName)
  // }, [silhouetteName])

  // console.log(silhouetteName)
  if (silhouetteName.length > 1)
    return (
      <motion.div layout transition={{ duration: 0.2 }} className="chip-svg-wrapper">
        <SilhouettePathSvg
          silhouetteName={silhouetteName}
          palette={palette}
          xScale={x}
          yScale={y}
          animationDuration={animationDuration}
        />
      </motion.div>
    )
  else return <span>{silhouetteName}</span>
}

export function SilhouettePathSvg({
  silhouetteName,
  palette,
  posX = 0,
  posY = 0,
  xScale,
  yScale,
  animationDuration,
  viewBox = 100,
  useAsSize = false,
  strokeWidth = 5,
}) {
  return (
    <svg
      className="silhouetteCanvas"
      viewBox={!useAsSize ? `0 0 ${viewBox} ${viewBox}` : "0 0 100 100"}
      width={useAsSize ? viewBox : "auto"}
      height={useAsSize ? viewBox : "auto"}
      x={posX}
      y={posY}
    >
      <g
        className="silhouetteGroup
    "
      >
        {silhouetteName.split("-").map((char, i, arr) => {
          return (
            <g key={i}>
              <motion.circle
                initial={{ r: 0, cx: xScale(i), cy: yScale(char), fill: palette[char] }}
                animate={{ r: 9, cx: xScale(i), cy: yScale(char), fill: palette[char] }}
                transition={{
                  duration: animationDuration,
                  type: "tween",
                  delay: i * animationDuration,
                }}
                key={`circle-start-i${i}`}
                id={`circle-start-i${i}`}
                strokeWidth="1"
                // stroke="var(--surface-primary)"
              />
              <motion.path
                initial={{ pathLength: 0, strokeWidth: 0 }}
                animate={{ pathLength: 1, strokeWidth: strokeWidth, opacity: 0.5 }}
                transition={{
                  duration: animationDuration,
                  type: "tween",
                  delay: i * animationDuration,
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
    </svg>
  )
}

const chipVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
}
const buttonVariants = {
  visible: { opacity: 1, transition: { duration: 0.2 } },
  hidden: { opacity: 0, transition: { duration: 0.2 } },
  // hover: { opacity: 1, width: "auto", transition: { duration: 0.2 } },
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
      <AnimatePresence>
        {isHovered && (
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
        )}
      </AnimatePresence>
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
