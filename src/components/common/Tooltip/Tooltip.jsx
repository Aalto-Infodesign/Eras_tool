import { useMouseMove } from "../../hooks/useMouseMove"
import styles from "./Tooltip.module.css"
// import classNames from "classnames"

import { motion, AnimatePresence } from "motion/react"

export function Tooltip({ children, isVisible }) {
  const mousePosition = useMouseMove()

  // isVisible && console.log(isVisible)
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="tooltip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={styles.tooltip}
          style={{
            top: `${mousePosition.y}px`,
            left: `${mousePosition.x + 25}px`,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
