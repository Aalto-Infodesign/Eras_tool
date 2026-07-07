import { AnimatePresence, motion } from "motion/react"

/**
 * Flashlight dots: one clickable circle per link whose source falls inside the
 * flashlight around the cursor. Rendered on the row baseline (cy = 0 — parents
 * position the group); the flashlight test happens in absolute SVG coordinates
 * via `absoluteY`.
 */
export const ScrubDots = ({ items, xScale, absoluteY, isInFlashlight, onSelect }) => (
  <AnimatePresence>
    {items.map((item) => {
      const cx = xScale(item.x)
      const flashlight = isInFlashlight(cx, absoluteY)

      if (!flashlight.visible) return null

      return (
        <motion.circle
          id={`lump-circle-${item.id}-${item.x}`}
          key={`lump-circle-${item.id}-${item.x}`}
          initial={{ cx: cx, cy: 0, r: 0, opacity: flashlight.opacity * 0.8 }}
          animate={{
            fill: "white",
            r: flashlight.opacity * 2,
          }}
          exit={{ r: 0 }}
          whileHover={{ scale: 1.5, opacity: 1 }}
          onClick={() => onSelect(item.id)}
          style={{ cursor: "pointer" }}
        />
      )
    })}
  </AnimatePresence>
)
