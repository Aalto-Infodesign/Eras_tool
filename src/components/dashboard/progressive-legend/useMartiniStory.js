/**
 * Martini-glass story controller for the TrajectoriesChart.
 *
 * While clustering streams in (largest silhouette first), the chart builds up
 * in fixed steps, each paired with a ProgressiveLegend item. A step advances
 * once its data precondition is met AND a minimum dwell has elapsed, so the
 * user has time to read the legend text.
 *
 * Steps → chart layers:
 *   STATES     grid horizontal lines (<Grid>)
 *   SEGMENT    one exemplar link (<StorySpotlight>)
 *   TRAJECTORY the exemplar's full trajectory (<StorySpotlight>)
 *   SILHOUETTE real medoid lines (<TrajectoriesMotion>)
 *   BOXPLOTS   per-state box plots (<Lumps>)
 *   DONE       story inert, every gate open — normal interactive UI
 *
 * With features.progressiveStory off (or after skip/completion) `show()` is
 * always true, so the chart renders exactly as it does without the story.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { useClustering } from "../../../contexts/ClusteringContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { features } from "../../../config/features"
import { useCharts } from "../main-charts/ChartsContext"

export const STEP = {
  STATES: 1,
  SEGMENT: 2,
  TRAJECTORY: 3,
  SILHOUETTE: 4,
  BOXPLOTS: 5,
  DONE: 6,
}

// Minimum time a step stays on screen once its data is ready
const DWELL_MS = 5000

export function useMartiniStory() {
  const { resultsBySilhouette, revealedSilhouettes } = useClustering()
  const { selectedLinks } = useDerivedData()
  const { setSelectedSilhouettesNames } = useFilters()
  const { isMartiniDone, setIsMartiniDone } = useCharts()

  const storyActive = !isMartiniDone && features.progressiveStory
  const [step, setStep] = useState(storyActive ? STEP.STATES : STEP.DONE)
  // Once the user navigates by hand (clicking a legend item), stop auto-advancing
  // so the chosen step stays put instead of marching forward again.
  const [manual, setManual] = useState(false)

  // Exemplar = the median medoid of the first silhouette to finish (the largest
  // one, since the worker processes largest-first). Its links come from
  // selectedLinks so they stay available regardless of the reveal state.
  const firstResult = resultsBySilhouette.values().next().value ?? null

  const exemplar = useMemo(() => {
    if (!firstResult) return null
    const links = selectedLinks
      .filter((l) => l.id === firstResult.medianMedoidID)
      .slice()
      .sort((a, b) => a.source.x - b.source.x)
    if (links.length === 0) return null
    return { id: firstResult.medianMedoidID, silhouette: firstResult.id, links }
  }, [firstResult, selectedLinks])

  // Tour-driven focus: while on the silhouette + box-plot steps, select the
  // analyzed (largest) silhouette so the chart narrows to it. The cleanup clears
  // it again when the tour ends, is skipped, steps back before the silhouette,
  // or the chart unmounts. Add/remove by name so an existing selection is left
  // untouched.
  const tourSilhouette = exemplar?.silhouette ?? null
  const focusSilhouette =
    storyActive && tourSilhouette && step >= STEP.SILHOUETTE && step < STEP.DONE
      ? tourSilhouette
      : null

  useEffect(() => {
    if (!focusSilhouette) return
    setSelectedSilhouettesNames((prev) =>
      prev.includes(focusSilhouette) ? prev : [...prev, focusSilhouette],
    )
    return () => {
      setSelectedSilhouettesNames((prev) => prev.filter((n) => n !== focusSilhouette))
    }
  }, [focusSilhouette, setSelectedSilhouettesNames])

  const canAdvance = useMemo(() => {
    switch (step) {
      case STEP.STATES:
        return exemplar !== null // first clustering output arrived
      case STEP.TRAJECTORY:
        return revealedSilhouettes.size > 0 // first silhouette settled
      case STEP.SEGMENT:
      case STEP.SILHOUETTE:
      case STEP.BOXPLOTS:
        return true // dwell only
      default:
        return false
    }
  }, [step, exemplar, revealedSilhouettes])

  // Remember the story is over once it actually reaches the end, so it doesn't
  // replay for a returning user. Skip() jumps straight to DONE, so that counts too.
  // NOTE: do NOT key this off `canAdvance` — that is false whenever the *next*
  // step's data hasn't arrived yet (always the case on mount, before the first
  // clustering result), which would end the story before it ever started.
  useEffect(() => {
    if (step >= STEP.DONE) setIsMartiniDone(true)
  }, [step, setIsMartiniDone])

  useEffect(() => {
    if (!storyActive || manual || step >= STEP.DONE || !canAdvance) return
    const timer = setTimeout(() => setStep((s) => Math.min(s + 1, STEP.DONE)), DWELL_MS)
    return () => clearTimeout(timer)
  }, [storyActive, manual, step, canAdvance])

  const show = useCallback((n) => !storyActive || step >= n, [storyActive, step])
  const skip = useCallback(() => {
    setManual(true)
    setStep(STEP.DONE)
  }, [])
  // Jump to a specific step (e.g. clicking a legend item to go back). Clamped to
  // the valid range and flags manual control so the story pauses there.
  //
  // Inert once the story is over: `show()` stops gating on `step` at that point,
  // so rewinding would strip legend items while leaving the chart untouched. The
  // finished legend is a static reference, not a scrubber.
  const goToStep = useCallback(
    (n) => {
      if (!storyActive) return
      setManual(true)
      setStep(Math.max(STEP.STATES, Math.min(n, STEP.DONE)))
    },
    [storyActive],
  )
  // Advance one step by hand (the Next button); also pins manual control.
  const next = useCallback(() => {
    setManual(true)
    setStep((s) => Math.min(s + 1, STEP.DONE))
  }, [])

  return { step, storyActive, show, skip, goToStep, next, canAdvance, exemplar }
}
