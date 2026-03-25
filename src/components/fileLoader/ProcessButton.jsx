import Button from "../common/Button/Button"
import { useViz } from "../../contexts/VizContext"
import { useModifierKey } from "../hooks/useModifierKey"

export function ProcessButton({ setIsOpen }) {
  const { isLegend, setIsLegend } = useViz()
  const createVisualization = () => {
    setIsLegend(true)
    setIsOpen(false)
  }

  useModifierKey("Enter", () => !isLegend && createVisualization())

  return (
    <Button
      size="small"
      onClick={() => createVisualization()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          createVisualization()
        }
      }}
    >
      Create Visualization
    </Button>
  )
}
