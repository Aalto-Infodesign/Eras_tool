/**
 * Story-only SVG overlay for the martini-glass intro (steps SEGMENT and
 * TRAJECTORY): draws the exemplar medoid's first link, then its whole
 * trajectory, using the same scales and gradient defs as the real chart.
 * Renders nothing outside those two steps — purely additive.
 */

import { AnimatePresence, motion } from "motion/react"
import { useCharts } from "../main-charts/ChartsContext"
import { useViz } from "../../../contexts/VizContext"
import { STEP } from "./useMartiniStory"

export function StorySpotlight({ step, exemplar }) {
  const { marginTop, chartScales } = useCharts()
  const { palette } = useViz()
  const { x, y } = chartScales

  const visible = step === STEP.SEGMENT || step === STEP.TRAJECTORY
  const links = exemplar?.links ?? []
  const shown = step === STEP.SEGMENT ? links.slice(0, 1) : links

  return (
    <AnimatePresence>
      {visible && shown.length > 0 && (
        <motion.g id="story-spotlight" pointerEvents="none" exit={{ opacity: 0 }}>
          {shown.map((d, i) => (
            <motion.line
              key={`spotlight-${d.id}-${d.source.x}-${d.target.x}`}
              x1={x(d.source.x)}
              x2={x(d.target.x)}
              y1={y(d.source.state) + marginTop}
              y2={y(d.target.state) + marginTop}
              stroke={
                d.speed > 0
                  ? `url(#gradient-${d.source.state}-${d.target.state})`
                  : palette[d.source.state]
              }
              strokeDasharray={d.speed > 0 ? undefined : "3 5"}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0, strokeWidth: 1.5 }}
              animate={{ pathLength: 1, opacity: 1, strokeWidth: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: i * 0.15, ease: "easeOut" }}
            />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  )
}
