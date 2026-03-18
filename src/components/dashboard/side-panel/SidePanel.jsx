import { motion } from "motion/react"
import { SlidersHorizontal, Download } from "lucide-react"
import styles from "./SidePanel.module.css"
import { Filters } from "../filters/FiltersWrapper"
import { useState } from "react"
import { useModifierKey } from "../../hooks/useModifierKey"
import { ExportIDs } from "../export/ExportIDs"
import { useWindowSize } from "../../hooks/useWindowSize"
import { createPortal } from "react-dom"
import { useViz } from "../../../contexts/VizContext"

export const SidePanel = () => {
  const { isSidePanelOpen, setSidePanelOpen } = useViz()
  const [panelContent, setPanelContent] = useState("filters")

  const { width } = useWindowSize()

  const handlePanelOpen = (content) => {
    setSidePanelOpen((prev) => (prev && panelContent === content ? false : true))
    setPanelContent(content)
  }

  useModifierKey("f", () => handlePanelOpen("filters"))
  useModifierKey("e", () => handlePanelOpen("export"))

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
      // onMouseEnter={() => setSidePanelOpen(true)}
      // onMouseLeave={() => setSidePanelOpen(false)}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={styles.sidePanel}
    >
      <div className={styles.panelButtons}>
        <PanelButton
          isSelected={panelContent === "filters"}
          onClick={() => handlePanelOpen("filters")}
        >
          <SlidersHorizontal size={20} />
        </PanelButton>
        <PanelButton
          isSelected={panelContent === "export"}
          onClick={() => handlePanelOpen("export")}
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

function PanelButton({ children, isSelected, onClick, className = "" }) {
  const buttonClassName = [
    styles.panelBtn,
    isSelected && styles.selected, // es. styles.primary
    className, // Qualsiasi classe passata dall'esterno
  ]
    .join(" ")
    .trim()

  return (
    <motion.button
      className={buttonClassName}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      //   whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  )
}
