import { motion } from "motion/react"
export const MotionText = ({ children, key, className = "", x = 0, y = 0, fontSize = 10 }) => {
  return (
    <motion.text
      key={key}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={className}
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      fontSize={fontSize}
    >
      {children}
    </motion.text>
  )
}
