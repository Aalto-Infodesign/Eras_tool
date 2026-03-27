import { useContext, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Text, Line } from "@react-three/drei"
import { useData } from "../../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../../contexts/VizContext"
import { useDerivedData } from "../../../../../contexts/DerivedDataContext"
import { getMinMaxStateFromTrajectories } from "../../../../../utils/getMinMax"
import { flattenDeep } from "lodash"

export const TrajectoriesCanvas = ({ width, height }) => {
  console.log("canvas")
  return (
    <div
      //   id="trajectories-chart"
      className="canvas-container"
      style={{ position: "absolute", inset: 0, height: "100%" }}
    >
      <Canvas
        orthographic
        camera={{ zoom: 50, position: [0, 0, 100] }}
        frameloop="demand" // only renders when invalidated
        //   style={{ position: "absolute", inset: 0 }}
        onCreated={({ gl }) => {
          // Ensures context is properly re-initialized on HMR
          gl.setPixelRatio(window.devicePixelRatio)
        }}
      >
        <ambientLight intensity={0.1} />
        <directionalLight color="red" position={[0, 0, 5]} />
        {/* 
        <mesh>
          <boxGeometry />
          <meshStandardMaterial />
        </mesh> */}

        <Grid />
      </Canvas>
    </div>
  )
}

// ─────────────────────────────────────────────
// Drop-in replacement for the SVG <Grid /> component.
//
// Props mirror the original:
//   setHoveredStateLabel  (optional) — called with name on mouseOver, undefined on leave
//
// Data is consumed from your existing context hooks exactly as before.
// Replace the mock data block below with your real context imports.
// ─────────────────────────────────────────────

// ── REPLACE THIS BLOCK with your real context imports ────────────────────────
// import { useData }        from "../../../contexts/ProcessedDataContext"
// import { useViz }         from "../../../contexts/VizContext"
// import { useDerivedData } from "../../../contexts/DerivedDataContext"
// import { useContext }     from "react"
// import { TrajectoriesContext } from "../TrajectoriesContext"
// import { getMinMaxStateFromTrajectories } from "../../../utils/getMinMax"
// import { moveElementInArray } from "../../../utils/moveChar"
// import { flattenDeep } from "lodash"
// import { ticks } from "d3"
// ─────────────────────────────────────────────────────────────────────────────

// World-space chart dimensions (tune zoom on <Canvas> to fit your layout)
const W = 6 // chart width  in world units
const H = 4 // chart height in world units
const DIV_INCREMENT = 10

// ── Scales (mirrors your d3 scales) ──────────────────────────────────────────
function linScale(domain, range) {
  return (v) => range[0] + ((v - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0])
}

function makeBandScale(domain) {
  const bandH = H / domain.length
  return (name) => {
    const i = domain.indexOf(name)
    // SVG y=0 is top; Three.js y=0 is center, positive = up
    return H / 2 - (i + 0.5) * bandH
  }
}

function makeTicks(lo, hi, approxCount) {
  const step = Math.ceil((hi - lo) / approxCount / 5) * 5 || 5
  const result = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) result.push(v)
  return result
}

// ── Vertical grid line + age label ───────────────────────────────────────────
function VertLine({ age, xScale, textColor }) {
  const x = xScale(age)
  return (
    <>
      <Line
        points={[
          [x, -H / 2, 0],
          [x, H / 2, 0],
        ]}
        color={textColor}
        lineWidth={0.5}
        dashed
        dashSize={0.08}
        gapSize={0.08}
        opacity={0.25}
        transparent
      />
      <Text
        position={[x, -H / 2 - 0.2, 0]}
        fontSize={0.13}
        color={textColor}
        anchorX="center"
        anchorY="top"
        fillOpacity={0.4}
      >
        {String(age)}
      </Text>
    </>
  )
}

// ── Horizontal state line + label + reorder arrows ───────────────────────────
function StateLine({
  name,
  index,
  total,
  y,
  color,
  statesOrder,
  setStatesOrder,
  setHoveredStateLabel,
  moveElementInArray, // pass your util in as a prop
}) {
  const label = name.length > 15 ? `${index} • ${name.substring(0, 8)}…` : `${index} • ${name}`

  return (
    <>
      {/* Dashed horizontal line */}
      <Line
        points={[
          [-W / 2, y, 0],
          [W / 2, y, 0],
        ]}
        color={color}
        lineWidth={0.8}
        dashed
        dashSize={0.12}
        gapSize={0.07}
        opacity={0.45}
        transparent
      />

      {/* State label — hoverable */}
      <Text
        position={[W / 2 + 0.12, y + 0.04, 0]}
        fontSize={0.14}
        color={color}
        anchorX="left"
        anchorY="middle"
        onPointerOver={() => setHoveredStateLabel?.(name)}
        onPointerOut={() => setHoveredStateLabel?.()}
      >
        {label}
      </Text>

      {/* Up arrow (disabled at top) */}
      <Text
        position={[W / 2 + 1.05, y + 0.16, 0]}
        fontSize={0.16}
        color={color}
        anchorX="center"
        anchorY="middle"
        fillOpacity={index === 0 ? 0.2 : 0.7}
        onClick={() => index > 0 && moveElementInArray?.(statesOrder, name, "up", setStatesOrder)}
      >
        ▲
      </Text>

      {/* Down arrow (disabled at bottom) */}
      <Text
        position={[W / 2 + 1.05, y - 0.05, 0]}
        fontSize={0.16}
        color={color}
        anchorX="center"
        anchorY="middle"
        fillOpacity={index === total - 1 ? 0.2 : 0.7}
        onClick={() =>
          index < total - 1 && moveElementInArray?.(statesOrder, name, "down", setStatesOrder)
        }
      >
        ▼
      </Text>
    </>
  )
}

// ── Active range line — animates x0 → x1 on mount (replaces motion.line) ────
function ActiveRangeLine({ state, xRange, yScale, color, xScale }) {
  const lineRef = useRef()
  const progress = useRef(0)

  const y = yScale(state)
  const x0 = xScale(xRange[0])
  const x1 = xScale(xRange[1])

  // useFrame = R3F's rAF hook. Runs every tick inside the Canvas.
  // We mutate the geometry directly to avoid triggering React re-renders.
  useFrame((_, delta) => {
    if (!lineRef.current) return
    progress.current = Math.min(progress.current + delta / 0.5, 1)
    const ease = 1 - Math.pow(1 - progress.current, 3) // cubic ease-out
    const curX1 = x0 + (x1 - x0) * ease
    const pos = lineRef.current.geometry.attributes.position
    pos.setXYZ(1, curX1, y, 0)
    pos.needsUpdate = true
    lineRef.current.computeLineDistances()
  })

  return (
    <Line
      ref={lineRef}
      // Start as zero-length; useFrame grows it each tick
      points={[
        [x0, y, 0],
        [x0, y, 0],
      ]}
      color={color}
      lineWidth={2.5}
      opacity={0.9}
      transparent
    />
  )
}

// ── Inner scene (no Canvas here — compose this inside your existing Canvas) ──
export function GridScene({
  // ── pass these in from your context hooks ──
  statesOrder,
  setStatesOrder,
  palette,
  ageRange,
  trajectories,
  filteredTrajectories,
  analytics,
  minMaxStates, // result of getMinMaxStateFromTrajectories(flattenDeep(t))
  moveElementInArray, // your util
  setHoveredStateLabel,
}) {
  const xScale = linScale(ageRange, [-W / 2, W / 2])
  const yScale = makeBandScale(statesOrder)
  const vertTicks = makeTicks(
    Math.max(1, ageRange[0] - DIV_INCREMENT),
    ageRange[1],
    ageRange[1] / DIV_INCREMENT,
  )

  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const textColor = dark ? "#c2c0b6" : "#3d3d3a"

  return (
    <>
      {/* Vertical grid lines */}
      {vertTicks.map((age) => (
        <VertLine key={`v-${age}`} age={age} xScale={xScale} textColor={textColor} />
      ))}

      {/* Horizontal state lines */}
      {statesOrder.map((name, i) => (
        <StateLine
          key={name}
          name={name}
          index={i}
          total={statesOrder.length}
          y={yScale(name)}
          color={palette[name]}
          statesOrder={statesOrder}
          setStatesOrder={setStatesOrder}
          setHoveredStateLabel={setHoveredStateLabel}
          moveElementInArray={moveElementInArray}
        />
      ))}

      {/* Active range lines (animated) */}
      {minMaxStates.map((d) => (
        <ActiveRangeLine
          key={`active-${d.state}`}
          state={d.state}
          xRange={d.x}
          yScale={yScale}
          color={palette[d.state]}
          xScale={xScale}
        />
      ))}
    </>
  )
}

// ── Standalone wrapper (use this if Grid owns its own Canvas) ─────────────────
// If you already have a <Canvas> higher up in your tree, use <GridScene> directly
// and delete this wrapper.
export function Grid({ setHoveredStateLabel }) {
  // ── swap these mocks for your real context hooks ──
  const { setStatesOrder, statesOrder } = useData()
  const { palette } = useViz()
  const { filteredTrajectories, analytics, trajectories } = useDerivedData()

  const { ageRange } = analytics
  const t = !filteredTrajectories ? trajectories : filteredTrajectories
  //   const xScale = chartScales.x
  //   const yScale = chartScales.y

  const minMaxStates = getMinMaxStateFromTrajectories(flattenDeep(t))

  return (
    <GridScene
      statesOrder={statesOrder}
      setStatesOrder={setStatesOrder}
      palette={palette}
      ageRange={ageRange}
      minMaxStates={minMaxStates}
      setHoveredStateLabel={setHoveredStateLabel}
    />
  )
}
