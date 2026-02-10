"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { includes, isNil } from "lodash"
import { scaleLinear, scaleBand, max } from "d3"

import { ClearButton } from "../../../common/Button/ClearButton"
import { DownloadIcon } from "../../../common/icons/Icons"

import { AnimatePresence, motion, scale, useInView } from "motion/react"

import { useModifierKey } from "../../../hooks/useModifierKey"
import { useLongPressWithProgress } from "../../../hooks/useLongPress"
import { useIsTouchDevice } from "../../../hooks/useIsTouchDevice"

import Switch from "../../../common/Switch/Switch"

import "./Silhouettes.css"

import * as THREE from "three"
import { Canvas, useFrame } from "@react-three/fiber"
import { Preload, View } from "@react-three/drei"
import { OrthographicCamera } from "@react-three/drei"

export const SilhouettesThree = (props) => {
  const TEST = 10

  const { statesNames } = props

  const {
    silhouettes = [],
    toggleSilhouetteFilter = () => {},
    setSelectedSilhouettes = () => {},
    selectedSilhouettes = [],
    palette = [],
    isHasse,
    setIsHasse,
  } = props
  const { statesOrder } = props

  const isCmdPressed = useModifierKey("Meta")

  const [hoveredIndex, setHoveredIndex] = useState(null)

  const [derivedSilhouettes, setDerivedSilhouettes] = useState(null)
  const [expandSides, setExpandSides] = useState(false)

  const containerRef = useRef()

  const w = 10,
    h = 10
  const isActive = selectedSilhouettes.length > 0

  const statesNamesLoaded = isNil(statesOrder) ? statesNames.sort() : statesOrder

  const y = scaleBand(statesNamesLoaded, [h / 2, -h / 2]).padding(0)
  const x = scaleLinear([0, max(silhouettes.map((d) => d.states.length - 1))], [-w / 2, w / 2])

  const svgPadding = 10
  const svgY = scaleBand(statesNamesLoaded, [svgPadding, 100 - svgPadding]).padding(0)
  const svgX = scaleLinear(
    [0, max(silhouettes.map((d) => d.states.length - 1))],
    [svgPadding, 100 - svgPadding],
  )
  const animationDuration = 0.2

  function downloadIDs(e, s) {
    e.stopPropagation()
    const ids = s.trajectories.map((d) => d[0].id)

    const textContent = "FINNGENID\n" + ids.join("\n")
    const blob = new Blob([textContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `ids_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const deriveSilhouettesFromId = (id) => {
    const next = silhouettes.filter((s) => s.name.includes(id) && s.name !== id)
    const previous = silhouettes.filter((s) => id.includes(s.name) && s.name !== id)
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

  useEffect(() => {
    if (isCmdPressed && hoveredIndex !== null) {
      const hoveredItemName = silhouettes[hoveredIndex].name
      deriveSilhouettesFromId(hoveredItemName)
    }

    if (!isCmdPressed || hoveredIndex === null) {
      setDerivedSilhouettes(null)
    }
  }, [isCmdPressed, hoveredIndex, silhouettes])

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

  return (
    <motion.section
      key={"silhouettes"}
      layout
      layoutId="silhouettes"
      className="bento-item silhouettes"
      variants={boxVariants}
      initial={"hidden"}
      animate={isHasse ? "hasse" : "trajectories"}
      ref={containerRef}
    >
      <motion.div layout className="header-with-switch">
        <h3>Silhouettes filters</h3>
        <Switch toggleFunction={setIsHasse} labelOn="Hasse" labelOff="Trajectories" />
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
              animate={"visible"}
            >
              <MorphHasse
                isHasse={isHasse}
                silhouettes={silhouettes}
                selectedSilhouettes={selectedSilhouettes}
                toggleSilhouetteFilter={toggleSilhouetteFilter}
                palette={palette}
                x={svgX}
                y={svgY}
                statesNamesLoaded={statesNamesLoaded}
                test={TEST}
              />
            </motion.section>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!isHasse && (
            <motion.div
              layoutScroll
              style={{
                top: 0,
                // position: "absolute",
              }}
              variants={chartVariants}
              animate={"visible"}
              transition={{ delay: 1 }}
              className="filter-container silhouettes"
            >
              <motion.div className="filter-bar">
                <AnimatePresence propagate>
                  {silhouettes.map((s, i) => {
                    const isHovered = hoveredIndex === i
                    const isSelected = includes(selectedSilhouettes, s.name)

                    const isCmdHovered = isCmdPressed && isHovered
                    const isSelectedExpand = expandSides && isSelected && isHovered

                    const isSideVisible = isCmdHovered || isSelectedExpand

                    const isExpandible = true

                    const opacity =
                      (isCmdPressed || expandSides) && hoveredIndex !== null && !isHovered ? 0.5 : 1

                    const cardVariants = {
                      hidden: { opacity: 0, scale: 0.5 },
                      visible: {
                        scale: 1,
                        opacity: opacity,
                        gap: isSideVisible ? "var(--spacing-xs)" : 0,
                        transition: {
                          opacity: { duration: 0.2 },
                        },
                      },
                    }

                    return (
                      <SilhouetteCardWrapper
                        key={i}
                        s={s}
                        i={i}
                        {...{
                          cardVariants,
                          isSideVisible,
                          isExpandible,
                          isSelected,
                          isHovered,
                          handleSilhouetteClick,
                          downloadIDs,
                          handleExpandClick,
                          handleLongPress,
                          expandSides,
                          isHasse,
                          x,
                          y,
                          palette,
                          animationDuration,

                          setHoveredIndex,
                          setExpandSides,
                          derivedSilhouettes,
                          toggleSilhouetteFilter,
                          isCmdPressed,
                          selectedSilhouettes,
                        }}
                      />
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Canvas
        className="canvas-global"
        eventSource={containerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
        }}
      >
        <Preload all />
        <View.Port />
      </Canvas>
    </motion.section>
  )
}

function SilhouetteCardWrapper({ s, i, ...props }) {
  const {
    cardVariants,
    isSideVisible,
    isExpandible,
    isSelected,
    isHovered,
    handleSilhouetteClick,
    downloadIDs,
    handleExpandClick,
    handleLongPress,
    expandSides,
    isHasse,
    x,
    y,
    palette,
    animationDuration,
    setHoveredIndex,
    setExpandSides,
    derivedSilhouettes,
    toggleSilhouetteFilter,
    isCmdPressed,
    selectedSilhouettes,
  } = props

  const inViewRef = useRef(null)
  const isInView = useInView(inViewRef, { margin: "0px 200px 0px 200px" })

  return (
    <motion.div
      key={`card-${s.name}`}
      className="silhouette-card"
      ref={inViewRef}
      variants={cardVariants}
      initial={"hidden"}
      //   initial={{ visibility: "hidden", opacity: 0, scale: 0 }}
      //   animate={{ visibility: "hidden", opacity: 0, scale: 0 }}
      animate={isHasse ? "hidden" : "visible"}
      exit={"hidden"}
      whileHover={{
        backgroundColor: isSideVisible ? "var(--surface-light)" : "none",
        padding: isSideVisible ? "var(--spacing-xs)" : "0",
      }}
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
        isInView={isInView}
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
    isInView,
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
    hidden: { opacity: 0, y: 5 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, delay: isCmdPressed ? 0 : 1 + i * 0.04, ease: "easeInOut" },
    }),
    tapped: { scale: 0.95, transition: { duration: 0.2 } },
  }

  return (
    <motion.div
      key={`typology-card-${s.name}-${i}`}
      custom={i}
      variants={cardVariants}
      initial={"hidden"}
      animate={"visible"}
      exit={"hidden"}
      className={`typology ${isSelected ? "selected" : ""}`}
      whileTap={"tapped"}
      onClick={handleCardClick}
      {...longPressProps}
      style={{ backgroundColor: isInView ? "red" : "blue" }}
    >
      {s.trajectories[0].length !== 0 && (
        <button className="action-button download" onClick={(e) => downloadIDs(e, s)}>
          <DownloadIcon size={10} />
        </button>
      )}

      <span className="typology-perc-text" y={130} x={0} fill="white">
        {s.percentage.toFixed(1)}%
      </span>
      <div className={`silhouette-wrapper`}>
        <SilhouettePathCanvas
          keyName="card"
          silhouetteName={s.name}
          palette={palette}
          xScale={x}
          yScale={y}
          strokeWidth={9}
          radius={9}
          isHasse={isHasse}
          isInView={isInView}
        />
      </div>
      <AnimatePresence>
        {isHovered && isSelected && !isCmdPressed && isExpandible && (
          <div className="action-button expand">
            <AnimatePresence>
              {isTouchDevice && longPressProps.isPressed && (
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
              key={`toggle-${s}`}
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
  return (
    <motion.div
      key={`toggle-${silhouetteName}`}
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
        <SilhouettePathCanvas
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
  hovered: { scale: 0.95, transition: { ease: "easeInOut" } },
}

const closeBtnVariants = {
  hidden: { scale: 0 },
  hovered: { scale: 1, transition: { ease: "easeInOut" } },
}
export function SilhouetteChip({ s, palette, x, y, animationDuration, toggleSilhouetteFilter }) {
  return (
    <motion.div
      key={s}
      layout
      variants={chipVariants}
      layoutId={`filter-${s}`}
      className="chip selected"
      initial={"hidden"}
      animate={"visible"}
      exit={"hidden"}
      transition={{ duration: animationDuration }}
      whileHover={"hovered"}
    >
      <motion.button
        className="close-btn"
        variants={closeBtnVariants}
        layout
        onClick={() => toggleSilhouetteFilter(s)}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        ×
      </motion.button>
      <SmallSilhouette silhouetteName={s} palette={palette} x={x} y={y} />
    </motion.div>
  )
}

// AnimatedCircle: Individual circle with smooth lerp animation
function AnimatedCircle({ x, y, color, radius }) {
  const ref = useRef()
  const target = useMemo(() => new THREE.Vector3(x, y, 0), [x, y])

  useFrame(() => {
    if (ref.current) {
      ref.current.position.lerp(target, 0.1)
    }
  })

  return (
    <mesh ref={ref} position={[x, y, 0]}>
      <circleGeometry args={[radius, 20]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

// LineSegment: Connection between circles
function LineSegment({ start, end, color, strokeWidth }) {
  const curve = useMemo(() => {
    return new THREE.LineCurve3(
      new THREE.Vector3(start[0], start[1], 0),
      new THREE.Vector3(end[0], end[1], 0),
    )
  }, [start, end])

  return (
    <mesh>
      <tubeGeometry args={[curve, 2, strokeWidth, 8, false]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  )
}

// SilhouetteBody: Main silhouette geometry
function SilhouetteBody({ silhouetteName, palette, xScale, yScale, isHasse, strokeWidth, radius }) {
  const chars = silhouetteName.split("-")

  return (
    <group>
      {chars.map((char, i, arr) => {
        const startX = xScale(i)
        const startY = yScale(char)
        const endX = arr[i + 1] !== undefined ? xScale(i + 1) : null
        const endY = arr[i + 1] !== undefined ? yScale(arr[i + 1]) : null

        const color = palette[char]

        const radiusScale = isHasse ? 9 / 100 : radius / 100
        const circleRadius = radiusScale * 10

        return (
          <group key={`${silhouetteName}-${i}`}>
            <AnimatedCircle x={startX} y={startY} color={color} radius={circleRadius} />

            {endX !== null && (
              <LineSegment
                start={[startX, startY]}
                end={[endX, endY]}
                color={color}
                strokeWidth={strokeWidth / 50}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

// SilhouettePathCanvas: Main component using View for each instance
export function SilhouettePathCanvas({
  keyName = "",
  silhouetteName,
  palette,
  xScale,
  yScale,
  strokeWidth = 5,
  radius = 5,
  isHasse = false,
  isChip = false,
  isInView = true,
}) {
  const size = isChip ? 28 : isHasse ? 28 : 64
  const zoom = isChip ? 2 : isHasse ? 2 : 5
  const viewRef = useRef()

  return (
    <div
      ref={viewRef}
      className="silhouette-path"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
      }}
    >
      <View
        index={silhouetteName}
        track={viewRef}
        style={{ width: size, height: size }}
        frames={isInView ? Infinity : 0}
      >
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={zoom} />
        <ambientLight intensity={1} />
        {/* <color attach="background" args={["#a73636"]} /> */}
        {/* <group>
          <mesh>
            <planeGeometry args={[20, 20]} />
            <meshBasicMaterial color={"red"} transparent opacity={0.5} />
          </mesh>
        </group> */}

        {isInView && (
          <SilhouetteBody
            silhouetteName={silhouetteName}
            palette={palette}
            xScale={xScale}
            yScale={yScale}
            isHasse={isHasse}
            strokeWidth={strokeWidth}
            radius={radius}
          />
        )}
      </View>
    </div>
  )
}

// MorphHasse component placeholder (you'll need to implement based on your needs)
function MorphHasse({
  isHasse,
  silhouettes,
  selectedSilhouettes,
  toggleSilhouetteFilter,
  palette,
  x,
  y,
  statesNamesLoaded,
  test,
}) {
  // This would be your Hasse diagram implementation
  // For now returning a placeholder
  return <div>Hasse Diagram Placeholder</div>
}
