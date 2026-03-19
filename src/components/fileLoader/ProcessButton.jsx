import Button from "../common/Button/Button"
import { useViz } from "../../contexts/VizContext"

export function ProcessButton({ setIsOpen }) {
  const { setIsLegend } = useViz()
  const createVisualization = () => {
    setIsLegend(true)
    setIsOpen(false)
  }

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
