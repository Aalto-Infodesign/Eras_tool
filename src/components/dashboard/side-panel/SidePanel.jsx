import { motion } from "motion/react"
import { SlidersHorizontal, Download } from "lucide-react"
import styles from "./SidePanel.module.css"
import { Filters } from "../filters/Filters"
import { useEffect, useState } from "react"
import { useModifierKey } from "../../hooks/useModifierKey"
import { ExportIDs } from "../export/ExportIDs"
console.log(styles)

export const SidePanel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [panelContent, setPanelContent] = useState("filters")

  const handlePanelOpen = (content) => {
    setIsOpen(isOpen && panelContent === content ? false : true)
    setPanelContent(content)
  }

  const isFPressed = useModifierKey("f")
  const isEPressed = useModifierKey("e")

  useEffect(() => {
    if (isFPressed) {
      handlePanelOpen("filters")
    }
    if (isEPressed) {
      handlePanelOpen("export")
    }
  }, [isFPressed, isEPressed])

  const panelVariants = {
    closed: { x: 190, y: "-50%" },
    open: { x: -2 },
  }
  return (
    <motion.section
      key={"side-panel"}
      id="side-panel"
      variants={panelVariants}
      initial={"closed"}
      animate={isOpen ? "open" : "closed"}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
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
    </motion.section>
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
