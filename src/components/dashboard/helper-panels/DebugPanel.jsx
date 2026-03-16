import useWindowSize from "../../hooks/useWindowSize"
import useFramerate from "../../hooks/useFramerate"

export function DebugPanel() {
  const { width, height } = useWindowSize()
  const fps = useFramerate()

  const fpsColor = fps < 30 ? "red" : fps < 55 ? "orange" : "green"
  return (
    <div>
      <h4>Screen Resolution</h4>
      <p>
        {width}x{height} px
      </p>
      <h4>Frame Rate</h4>
      <p style={{ color: fpsColor, fontWeight: "bold" }}>{fps} fps</p>
    </div>
  )
}
