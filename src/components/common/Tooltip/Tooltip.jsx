import { useMouseMove } from "../../hooks/useMouseMove"
import styles from "./Tooltip.module.css"
import { createPortal } from "react-dom"
// import classNames from "classnames"

import { motion, AnimatePresence } from "motion/react"

export function Tooltip({ children, isVisible }) {
  const mousePosition = useMouseMove()

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: mousePosition.x + 15, y: mousePosition.y + 15 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0 }}
          className={styles.tooltip}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
