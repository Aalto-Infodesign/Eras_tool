import { motion } from "motion/react"

// A lump that contains a single link: rendered as a bare source→target line
// instead of a polygon.
export const LumpExtremeLine = ({ d, x, y, marginTop, isSelected, onClick, animationDuration }) => (
  <motion.line
    id={`lump-line-extreme-${d.type}`}
    className={"lump-line-extreme"}
    initial={{
      strokeWidth: 2,
      opacity: 0,
      stroke: `url(#gradient-${d.source.state}-${d.target.state})`,
      strokeLinecap: "round",
      pathLength: 0,
      x1: x(d.source.xExtent[0]),
      x2: x(d.target.xExtent[0]),
      y1: y(d.source.state) + marginTop,
      y2: y(d.target.state) + marginTop,
    }}
    animate={{
      x1: x(d.source.xExtent[0]),
      x2: x(d.target.xExtent[0]),
      y1: y(d.source.state) + marginTop,
      y2: y(d.target.state) + marginTop,
      pathLength: 1,
      strokeWidth: 1,
      opacity: 0.2,
    }}
    whileHover={{ strokeWidth: 2, opacity: isSelected ? 1 : 0.3 }}
    exit={{ strokeWidth: 0, pathLength: 0 }}
    transition={{ duration: animationDuration }}
    onClick={onClick}
  />
)
