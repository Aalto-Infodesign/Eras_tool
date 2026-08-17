/**
 * This component shows the progressive step by step legend building up as the user first
 * engages with the app, while the clustering is being executed under the hood. Thus creating a
 * Martini-glass structure in which the UI is building up and some info is revealed on how to read it.
 * Only then, unless the user had done it before, the full exploration can be done.
 *
 * Driven by useMartiniStory (called in TrajectoriesChart): items appear as the
 * matching chart layer mounts. Each item shows a static "how to read this"
 * text plus a live context line derived from the clustering output.
 * Texts are POC placeholders — the final copy model (readingText/contextText/
 * combinedText per StoryStep) comes later.
 */

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import styles from "./ProgressiveLegend.module.css"
import { STEP } from "./useMartiniStory"
import { useClustering } from "../../../contexts/ClusteringContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useData } from "../../../contexts/ProcessedDataContext"
import { useCharts } from "../main-charts/ChartsContext"
import Button from "../../common/Button/Button"
import {
  BoxPlotIcon,
  SegmentIcon,
  SilhouetteIcon,
  StatesIcon,
  TrajectoriesIcon,
} from "./animated-icons/Icons"

// Each step's animated icon illustrates the text beside it; they play as the
// item mounts, i.e. as the story reveals the step.
const ICON_SIZE = 64

const STORY_STEPS = [
  {
    step: STEP.STATES,
    kind: "states",
    title: "States",
    text: "The horizontal lines are states of a disease or drug. They can be removed or swapped!",
    Icon: StatesIcon,
  },
  {
    step: STEP.SEGMENT,
    kind: "segments",
    title: "Segments",
    text: "A diagonal segment is a switch from one state to the next. The steeper the segment, the faster the change.",
    Icon: SegmentIcon,
  },
  {
    step: STEP.TRAJECTORY,
    kind: "trajectories",
    title: "Trajectories",
    text: "Each trajectory line represents one individual, progressing from their first to their last state.",
    Icon: TrajectoriesIcon,
  },
  {
    step: STEP.SILHOUETTE,
    kind: "silhouettes",
    title: "Silhouettes",
    text: "A silhouette is a specific combination of states — it models how individuals traverse them.",
    Icon: SilhouetteIcon,
  },
  {
    step: STEP.BOXPLOTS,
    kind: "boxplots",
    title: "Box plots",
    text: "Box plots show the real extent of a silhouette. The box adapts to the selected silhouette.",
    Icon: BoxPlotIcon,
  },
]

export function ProgressiveLegend({
  step = STEP.DONE,
  onSkip,
  onSelectStep,
  onNext,
  canAdvance = true,
  exemplar = null,
}) {
  const { statesOrder } = useData()
  const { analytics } = useDerivedData()
  const { resultsBySilhouette, progress } = useClustering()
  // Shared, measured height of the trajectories SVG (see ChartsContext).
  const { chartHeight } = useCharts()

  const firstResult = resultsBySilhouette.values().next().value ?? null

  // Live example line per step — POC-simple, built from the first clustering outputs
  const contextFor = (kind) => {
    switch (kind) {
      case "states":
        return `This dataset has ${statesOrder.length} states.`
      case "segments": {
        const l = exemplar?.links[0]
        if (!l) return null
        return `${l.source.state} → ${l.target.state} in ~${l.speed.toFixed(1)} years.`
      }
      case "trajectories": {
        if (!exemplar) return null
        const path = [exemplar.links[0].source.state, ...exemplar.links.map((l) => l.target.state)]
        return `An individual going ${path.join(" → ")}.`
      }
      case "silhouettes": {
        if (!firstResult) return null
        return `Largest silhouette: "${firstResult.id}" with ${firstResult.metrics?.size ?? "?"} individuals.`
      }
      case "boxplots": {
        const [min, max] = analytics.ageRange
        return `Ages in this dataset span ${Math.round(min)}–${Math.round(max)} years.`
      }
      default:
        return null
    }
  }

  const visibleSteps = STORY_STEPS.filter((s) => s.step <= step)
  const isStoryRunning = step < STEP.DONE

  // Keep the newest legend item in view as the story reveals steps.
  const trackRef = useRef(null)
  useEffect(() => {
    if (!isStoryRunning) return
    const track = trackRef.current
    if (!track) return
    // rAF: let the new item mount before scrolling to it
    const id = requestAnimationFrame(() => {
      track.scrollTo({ top: track.scrollHeight, behavior: "smooth" })
    })
    return () => cancelAnimationFrame(id)
  }, [step, isStoryRunning, visibleSteps.length])

  return (
    <section className={styles.legendWrapper}>
      <div className={styles.legendTrack} ref={trackRef} style={{ height: chartHeight }}>
        <AnimatePresence initial={false}>
          {visibleSteps.map((s) => (
            <LegendItem
              key={s.kind}
              title={s.title}
              text={s.text}
              context={contextFor(s.kind)}
              Icon={s.Icon}
              // Only clickable while the story runs — once it is over the chart
              // no longer gates on `step`, so stepping back would do nothing.
              onClick={isStoryRunning ? () => onSelectStep?.(s.step) : undefined}
              isActive={isStoryRunning && s.step === step}
            />
          ))}
        </AnimatePresence>
      </div>

      <motion.div className={styles.legendFooter} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {progress.done !== progress.total ? (
          <p className={styles.progressNote}>
            Analyzing silhouettes… {progress.done}/{progress.total || "?"}
          </p>
        ) : (
          <p className={styles.progressNote}>
            Clustering done: {progress.done}/{progress.total || "?"}
          </p>
        )}

        <div className={styles.legendActions}>
          {onSkip && (
            <Button
              size="xs"
              variant="secondary"
              onClick={onSkip}
              tooltip="Skip to the full chart"
              tooltipPosition="bottom-left"
              disabled={!isStoryRunning}
            >
              Skip
            </Button>
          )}
          {onNext && (
            <Button
              size="xs"
              onClick={onNext}
              disabled={!canAdvance}
              tooltip={canAdvance ? "Reveal the next step" : "Waiting for the analysis…"}
              tooltipPosition="bottom-left"
            >
              {step === STEP.BOXPLOTS ? "Finish" : "Next"}
            </Button>
          )}
        </div>
      </motion.div>
    </section>
  )
}

function LegendItem({ title, text, context, Icon, isActive, onClick }) {
  // No onClick means the story is over: drop the pointer and hover affordances
  // rather than inviting a click that does nothing.
  const interactive = Boolean(onClick)

  return (
    <motion.div
      className={styles.legendItem}
      data-active={isActive}
      data-interactive={interactive}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={interactive ? { scale: 0.98, transition: { duration: 0.1, ease: "easeOut" } } : undefined}
      onClick={onClick}
    >
      <div className={styles.legendItemBody}>
        <h3>{title}</h3>
        <p>{text}</p>
        {context && <p className={styles.contextText}>{context}</p>}
      </div>
      {Icon && (
        <div className={styles.legendItemIcon} aria-hidden="true">
          <Icon size={ICON_SIZE} />
        </div>
      )}
    </motion.div>
  )
}
