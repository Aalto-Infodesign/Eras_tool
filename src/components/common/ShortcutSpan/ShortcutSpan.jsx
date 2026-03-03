import styles from "./ShortcutSpan.module.css"
import { useModifierKey } from "../../hooks/useModifierKey"
import { motion } from "motion/react"

export const ShortcutSpan = ({ children, separator = null, keyCode = "" }) => {
  const isPressed = useModifierKey(keyCode)

  const spanVariants = {
    default: { scale: 1 },
    pressed: { scale: 0.7 },
  }

  return (
    <>
      <motion.span
        variants={spanVariants}
        initial="default"
        animate={isPressed ? "pressed" : "default"}
        className={styles.shortcut}
      >
        {children}
      </motion.span>
      {separator && <span className={styles.separator}>{separator}</span>}
    </>
  )
}
