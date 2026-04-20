import Button from "../common/Button/Button"
import { useViz } from "../../contexts/VizContext"
import { useModifierKey } from "../hooks/useModifierKey"
import { ArrowRight } from "lucide-react"

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
      variant="tertiary"
      onClick={() => createVisualization()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          createVisualization()
        }
      }}
      tooltip={"Create Visualization"}
      tooltipPosition="left"
    >
      <ArrowRight size={16} />
    </Button>
  )
}
