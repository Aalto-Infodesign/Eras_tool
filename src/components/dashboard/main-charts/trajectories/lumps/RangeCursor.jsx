import { motion } from "motion/react"

// The scrub cursor: a vertical tick plus the translucent flashlight window,
// following the mouse along the hovered state's row.
export const RangeCursor = ({ x, y, radius, animationDuration, onLeave }) => (
  <motion.g
    id="range-cursor"
    key="range-cursor"
    initial={{ y: y, x: x }}
    animate={{ y: y, x: x }}
    exit={{ y: y, x: x }}
    transition={{ default: { duration: animationDuration }, x: { duration: 0 } }}
    style={{ pointerEvents: "none" }}
  >
    <motion.line
      initial={{ y2: 4 }}
      animate={{ y2: -4 }}
      exit={{ y2: 4 }}
      y1={4}
      stroke="white"
      strokeWidth={0.5}
      strokeOpacity={0.6}
    />
    <motion.rect
      initial={{
        x: -radius / 2,
        y: -3,
        width: 0,
        height: 6,
      }}
      animate={{
        x: -radius,
        width: radius * 2,
      }}
      exit={{
        x: -radius,
        width: 0,
      }}
      transition={{
        default: { duration: animationDuration, ease: "easeInOut" },
        x: { duration: 0 },
      }}
      fill="white"
      fillOpacity={0.3}
      stroke="white"
      strokeWidth={0}
      rx={1}
      onMouseLeave={onLeave}
    />
  </motion.g>
)
