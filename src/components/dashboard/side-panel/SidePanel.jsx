import { motion } from "motion/react"
import { SlidersHorizontal, Download } from "lucide-react"
import styles from "./SidePanel.module.css"
import { Filters } from "../filters/Filters"
import { useState } from "react"
import { ExportIDs } from "../export/ExportIDs"
import { useWindowSize } from "../../hooks/useWindowSize"
import { createPortal } from "react-dom"
import { useViz } from "../../../contexts/VizContext"
import Button from "../../common/Button/Button"

export const SidePanel = () => {
  const { isSidePanelOpen, setSidePanelOpen } = useViz()
  const [panelContent, setPanelContent] = useState("filters")

  const { width } = useWindowSize()

  const handlePanelOpen = (content) => {
    setSidePanelOpen((prev) => (prev && panelContent === content ? false : true))
    setPanelContent(content)
  }

  const panelVariants = {
    closed: { x: width < 1840 ? width - 28 : width - 220 },
    open: { x: width - 220 },
  }
  return createPortal(
    <motion.section
      key={"side-panel"}
      id="side-panel"
      variants={panelVariants}
      initial={"closed"}
      animate={isSidePanelOpen ? "open" : "closed"}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={styles.sidePanel}
    >
      <div className={styles.panelButtons}>
        <PanelButton
          tooltip="Toggle filters"
          tooltipPosition="left"
          isSelected={panelContent === "filters"}
          onClick={() => handlePanelOpen("filters")}
          keystroke="f"
        >
          <SlidersHorizontal size={20} />
        </PanelButton>
        <PanelButton
          tooltip="Toggle export panel"
          tooltipPosition="left"
          isSelected={panelContent === "export"}
          onClick={() => handlePanelOpen("export")}
          keystroke="e"
        >
          <Download size={20} />
        </PanelButton>
      </div>
      <section className={styles.panelContent}>
        {panelContent === "filters" && <Filters />}
        {panelContent === "export" && <ExportIDs />}
      </section>
    </motion.section>,
    document.body,
  )
}

function PanelButton({ children, isSelected, onClick, className = "", ...rest }) {
  const buttonClassName = [styles.panelBtn, isSelected && styles.selected, className]
    .join(" ")
    .trim()

  return (
    <Button className={buttonClassName} whileHover={{ scale: 1.05 }} onClick={onClick} {...rest}>
      {children}
    </Button>
  )
}
