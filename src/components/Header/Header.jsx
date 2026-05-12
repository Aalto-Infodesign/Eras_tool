import { useViz } from "../../contexts/VizContext"
import Button from "../common/Button/Button"
import { FilterPanel } from "../dashboard/filter-panel/FilterPanel"
import styles from "./Header.module.css"

import { ChevronDown, Maximize2, User } from "lucide-react"

export const Header = () => {
  const { setIsLegend, isLegend, isOpen, setIsOpen } = useViz()
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>ERAS</h1>
      <FilterPanel />

      <div className="buttons-wrapper">
        {isLegend && (
          <Button
            tooltip={isOpen ? "Collapse States Panel" : "Expand States Panel"}
            tooltipPosition="left"
            size="xs"
            variant="transparent"
            keystroke="c"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <ChevronDown size={16} transform={isOpen ? "rotate(180)" : "rotate(0)"} />
          </Button>
        )}

        <Button
          tooltip={"Back to State Manager"}
          tooltipPosition="left"
          size="xs"
          variant="transparent"
          onClick={() => setIsLegend(false)}
        >
          <Maximize2 size={16} />
        </Button>
      </div>
    </header>
  )
}
