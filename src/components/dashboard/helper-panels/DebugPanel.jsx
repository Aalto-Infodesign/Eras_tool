import useWindowSize from "../../hooks/useWindowSize"
import useFramerate from "../../hooks/useFramerate"
import { useMemo } from "react"
import { useViz } from "../../../contexts/VizContext"
import { useModifierKey } from "../../hooks/useModifierKey"

export function DebugPanel() {
  const { width, height } = useWindowSize()
  const fps = useFramerate()
  const svgElementsCount = useCountSvgElements()

  const fpsColor = fps < 30 ? "red" : fps < 55 ? "orange" : "green"
  return (
    <div>
      <h4>Screen Resolution</h4>
      <p>
        {width}x{height} px
      </p>
      <h4>Frame Rate</h4>
      <p style={{ color: fpsColor, fontWeight: "bold" }}>{fps} fps</p>
      <h4>SVG Elements</h4>
      <p style={{}}>{svgElementsCount}</p>
    </div>
  )
}

const useCountSvgElements = () => {
  const { chartType, isHasse } = useViz()
  const refresh = useModifierKey("r")
  return useMemo(() => {
    const svgs = document.querySelectorAll("svg")
    let count = 0
    svgs.forEach((svg) => {
      count += svg.querySelectorAll("*").length
    })
    return count
  }, [chartType, refresh])
}
