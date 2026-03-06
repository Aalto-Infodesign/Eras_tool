import { Canvas, useThree } from "@react-three/fiber"
import { scaleLinear, extent } from "d3"
import { Line } from "@react-three/drei"

export default function StackedLines({ data, extent, width, height }) {
  return (
    <div style={{ width, height }}>
      <Canvas
        orthographic
        camera={{ zoom: 50, position: [0, 0, 100] }}
        onCreated={({ gl }) => {
          // Ensures context is properly re-initialized on HMR
          gl.setPixelRatio(window.devicePixelRatio)
        }}
      >
        <ambientLight intensity={0.5} />

        <Lines data={data} domain={extent} />
      </Canvas>
    </div>
  )
}

function Lines({ data, domain }) {
  const { viewport } = useThree()
  const hw = viewport.width / 2

  const xScale = scaleLinear()
    .domain(domain) // e.g. [1990, 2024]
    .range([-hw, hw]) // world space, centered at 0

  const spacing = viewport.height / (data.length + 1)

  return data.map((d, i) => {
    const [x1, x2] = extent(d.years)
    const y = hw - spacing * (i + 1) // stack lines vertically

    return (
      <Line
        key={i}
        points={[
          [xScale(x1), y, 0], // start point [x, y, z]
          [xScale(x2), y, 0], // end point [x, y, z]
        ]}
        color="white"
        lineWidth={2}
      />
    )
  })
}
