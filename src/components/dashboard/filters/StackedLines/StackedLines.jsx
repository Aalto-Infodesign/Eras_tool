import { useMemo, useState, useEffect, useCallback } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { scaleLinear, extent } from "d3"
import { Line } from "@react-three/drei"
import * as THREE from "three"
import Button from "../../../common/Button/Button"
import { useFilters } from "../../../../contexts/FiltersContext"

import styles from "./StackedLines.module.css"

export default function StackedLines({ data, extent, width, height }) {
  const [orderMode, setOrderMode] = useState("start")
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const { toggleSelectedTrajectory, selectedTrajectoriesIDs } = useFilters()

  const handleMouseMove = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const yRatio = (e.clientY - rect.top) / rect.height // 0 (top) → 1 (bottom)
      const index = Math.floor(yRatio * data.length)
      setHoveredIndex(Math.min(index, data.length - 1))
    },
    [data.length],
  )

  const sortedData = useMemo(() => {
    if (!data) return []

    switch (orderMode) {
      case "start":
        return [...data].sort((a, b) => +a.years[0] - +b.years[0])

      case "end":
        return [...data].sort((a, b) => +a.years.at(-1) - +b.years.at(-1))

      case "duration":
        return [...data].sort((a, b) => a.diseaseDuration - b.diseaseDuration)

      default:
        return [...data]
    }
  }, [data, orderMode])

  return (
    <div className="filter-box">
      <div>
        <div className="buttons-wrapper">
          <Button
            variant="tertiary"
            size="xs"
            data-selected={orderMode === "start"}
            onClick={() => setOrderMode("start")}
          >
            start
          </Button>
          <Button
            variant="tertiary"
            size="xs"
            data-selected={orderMode === "end"}
            onClick={() => setOrderMode("end")}
          >
            end
          </Button>
          <Button
            variant="tertiary"
            size="xs"
            data-selected={orderMode === "duration"}
            onClick={() => setOrderMode("duration")}
          >
            duration
          </Button>
        </div>
      </div>
      <div
        style={{ width, height, position: "relative" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => toggleSelectedTrajectory(sortedData[hoveredIndex].FINNGENID)}
      >
        <Canvas
          orthographic
          camera={{ zoom: 50, position: [0, 0, 100] }}
          frameloop="demand" // only renders when invalidated
          style={{ position: "absolute", inset: 0 }}
          onCreated={({ gl }) => {
            // Ensures context is properly re-initialized on HMR
            gl.setPixelRatio(window.devicePixelRatio)
          }}
        >
          <AllLines
            data={sortedData}
            domain={extent}
            selectedTrajectoriesIDs={selectedTrajectoriesIDs}
          />
        </Canvas>
        <Canvas
          orthographic
          camera={{ zoom: 50, position: [0, 0, 100] }}
          frameloop="demand"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          onCreated={({ gl }) => {
            // Ensures context is properly re-initialized on HMR
            gl.setPixelRatio(window.devicePixelRatio)
          }}
        >
          <HoveredLine data={sortedData} domain={extent} index={hoveredIndex} />
        </Canvas>
      </div>
      <div className={styles.infoPanel}>
        {hoveredIndex && (
          <div>
            <p>{sortedData[hoveredIndex]?.FINNGENID}</p>
            {orderMode !== "duration" ? (
              <p>
                from
                <span>{Math.floor(sortedData[hoveredIndex]?.years[0])}</span>
                to
                <span>{Math.floor(sortedData[hoveredIndex]?.years.at(-1))}</span>
              </p>
            ) : (
              <p>
                duration
                <span>{Math.floor(sortedData[hoveredIndex]?.diseaseDuration)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AllLines({ data, domain, selectedTrajectoriesIDs }) {
  const { viewport } = useThree()
  const hw = viewport.width / 2

  const xScale = useMemo(() => scaleLinear().domain(domain).range([-hw, hw]), [hw, domain])
  const spacing = viewport.height / (data.length + 1)

  const geometry = useMemo(() => {
    const positions = new Float32Array(data.length * 6) // 2 points * xyz = 6 floats per line

    data.forEach((d, i) => {
      const [x1, x2] = extent(d.years)
      const y = hw - spacing * (i + 1)
      const offset = i * 6

      // Point A
      positions[offset + 0] = xScale(x1)
      positions[offset + 1] = y
      positions[offset + 2] = 0
      // Point B
      positions[offset + 3] = xScale(x2)
      positions[offset + 4] = y
      positions[offset + 5] = 0
    })

    const colors = new Float32Array(data.length * 6) // RGB per vertex

    data.forEach((d, i) => {
      const isSelected = selectedTrajectoriesIDs.includes(d.FINNGENID)
      const color = new THREE.Color(isSelected ? "rgb(132, 75, 255)" : "white")
      const offset = i * 6
      // same color for both endpoints of each line
      colors[offset + 0] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
      colors[offset + 3] = color.r
      colors[offset + 4] = color.g
      colors[offset + 5] = color.b
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    return geo
  }, [data, domain, viewport, spacing])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors opacity={0.5} transparent />
      {/* <lineBasicMaterial color={"white"} opacity={0.5} transparent /> */}
    </lineSegments>
  )
}

function HoveredLine({ data, domain, index }) {
  const { viewport, invalidate } = useThree()
  const hw = viewport.width / 2
  const xScale = scaleLinear().domain(domain).range([-hw, hw])
  const spacing = viewport.height / (data.length + 1)

  useEffect(() => {
    invalidate()
  }, [index]) // tell R3F to re-render on index change

  if (index === null || !data[index]) return null

  const [x1, x2] = extent(data[index].years)
  const y = hw - spacing * (index + 1)

  return (
    <group position={[0, y, 0]}>
      <Line
        points={[
          [xScale(x1), 0, 0],
          [xScale(x2), 0, 0],
        ]}
        color="rgb(182, 148, 255)"
        lineWidth={2}
      />
      <mesh position={[xScale(x1), 0, 0]}>
        <circleGeometry args={[0.05, 10]} />
        <meshBasicMaterial color="rgb(182, 148, 255)" />
      </mesh>
      <mesh position={[xScale(x2), 0, 0]}>
        <circleGeometry args={[0.05, 10]} />
        <meshBasicMaterial color="rgb(182, 148, 255)" />
      </mesh>
    </group>
  )
}
