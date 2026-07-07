/**
 * Context that owns the progressive per-silhouette clustering lifecycle.
 * Feeds the duration matrices (rows = trajectories, columns = durations
 * between states) to newClustering.worker.js and exposes both the raw
 * per-silhouette results and render-ready ID sets for the trajectory chart.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useDerivedData } from "./DerivedDataContext"
import { useFilters } from "./FiltersContext"
import { useViz } from "./VizContext"
import { useNewClusteringWorker } from "../components/hooks/workerHooks/useNewClusteringWorker"

// How long a silhouette's full medoid set stays faded before collapsing to its
// median highlight — the "analysis happening" beat in the progressive reveal.
const REVEAL_DURATION_MS = 600

// Caps on how many medoid representatives the chart draws at once.
const OVERVIEW_CAP = 100 // silhouettes shown in the overview (one medoid each)
const FOCUSED_CAP = 100 // medoids shown across the selected silhouettes

const ClusteringContext = createContext(null)

export function ClusteringProvider({ children }) {
  const { silhouettes, selectedLinks } = useDerivedData()
  const { selectedSilhouettesNames } = useFilters()
  const { startLoading, stopLoading } = useViz()
  const { results, partials, progress, status, error, run, pause, resume, cancel } =
    useNewClusteringWorker()

  // Show the global spinner while clustering is in flight. startLoading/stopLoading
  // are counter-based, so the cleanup balances the increment when `running` ends.
  useEffect(() => {
    if (status !== "running") return
    startLoading()
    return () => stopLoading()
  }, [status, startLoading, stopLoading])

  const matrices = useMemo(
    () =>
      silhouettes.map((s) => ({
        id: s.name,
        ids: s.trajectories.map((t) => t[0].id),
        matrix: s.trajectories.map((t) => t.map((tt) => tt.speed)),
      })),
    [silhouettes],
  )

  useEffect(() => {
    if (matrices.length > 0) run(matrices)
  }, [matrices, run])

  // Progressive reveal: when a silhouette's result lands it first shows all its
  // medoids faded, then after REVEAL_DURATION_MS it "settles" — collapsing to
  // its median medoid. `revealedSilhouettes` holds the names that have settled.
  const [revealedSilhouettes, setRevealedSilhouettes] = useState(() => new Set())
  const revealTimers = useRef(new Map()) // silhouette name → timeout id

  useEffect(() => {
    // a fresh run clears results → reset the reveal so it replays
    if (results.size === 0) {
      revealTimers.current.forEach((t) => clearTimeout(t))
      revealTimers.current.clear()
      setRevealedSilhouettes((prev) => (prev.size === 0 ? prev : new Set()))
      return
    }
    // schedule a settle for every newly-arrived silhouette (once each)
    for (const name of results.keys()) {
      if (revealTimers.current.has(name)) continue
      const timer = setTimeout(() => {
        setRevealedSilhouettes((prev) => {
          const next = new Set(prev)
          next.add(name)
          return next
        })
      }, REVEAL_DURATION_MS)
      revealTimers.current.set(name, timer)
    }
    // revealedSilhouettes intentionally omitted: scheduling keys off results only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  useEffect(() => {
    const timers = revealTimers.current
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  // The diversity-pruned + percentage-capped representative medoids across all
  // silhouettes, ranked by represented cluster size (most representative first).
  // Consumers cap further from the top.
  const rankedMedoids = useMemo(() => {
    const medoids = []
    for (const result of results.values()) {
      for (const r of result.representatives) {
        medoids.push({ id: r.medoidID, size: r.representedSize, silhouette: result.id })
      }
    }
    return medoids.sort((a, b) => b.size - a.size)
  }, [results])

  // trajectoryID → represented cluster size, for weighting downstream aggregates
  const representativeWeights = useMemo(
    () => new Map(rankedMedoids.map((m) => [m.id, m.size])),
    [rankedMedoids],
  )

  const clusteringFailed = status === "error"
  const isOverview = selectedSilhouettesNames.length === 0

  /**
   * The medoid links the chart actually draws — the single source of truth shared
   * by TrajectoriesMotion (foreground lines) and Lumps (per-state lump lines).
   *
   * Overview, per silhouette in stable largest-first order:
   *   - discovering (no final yet, has a partial) → the modes found so far, faded;
   *   - finalized but not settled → all final representatives, faded;
   *   - settled → just the median medoid.
   * Focused: depth-first by represented size across the selected silhouettes.
   * On error: the raw selection (never blank). `revealFadedIDs` flags the medoids
   * in the faded beat (for opacity).
   */
  const { representativeLinks, revealFadedIDs } = useMemo(() => {
    if (clusteringFailed) return { representativeLinks: selectedLinks, revealFadedIDs: new Set() }

    // selectedLinks already reflects silhouette selection + active filters
    const scopeIDs = new Set(selectedLinks.map((l) => l.id))
    const keptIDs = new Set()
    const fadedIDs = new Set()

    const addFaded = (id) => {
      if (!scopeIDs.has(id)) return
      keptIDs.add(id)
      fadedIDs.add(id)
    }

    if (isOverview) {
      let shown = 0
      for (const s of silhouettes) {
        if (shown >= OVERVIEW_CAP) break
        const result = results.get(s.name)
        const partial = partials.get(s.name)
        if (!result && !partial) continue // not started yet
        shown++

        if (result && revealedSilhouettes.has(s.name)) {
          // settled → just the median medoid (if still in scope)
          if (scopeIDs.has(result.medianMedoidID)) keptIDs.add(result.medianMedoidID)
        } else if (result) {
          // finalized, not yet settled → all representatives, faded
          for (const r of result.representatives) addFaded(r.medoidID)
        } else {
          // discovering → modes found so far, faded
          for (const id of partial) addFaded(id)
        }
      }
    } else {
      // depth-first by represented cluster size across the selected silhouettes
      const inScope = rankedMedoids.filter((m) => scopeIDs.has(m.id))
      for (const m of inScope) {
        if (keptIDs.size >= FOCUSED_CAP) break
        keptIDs.add(m.id)
      }
    }

    return {
      representativeLinks: selectedLinks.filter((l) => keptIDs.has(l.id)),
      revealFadedIDs: fadedIDs,
    }
  }, [
    clusteringFailed,
    selectedLinks,
    rankedMedoids,
    isOverview,
    silhouettes,
    results,
    partials,
    revealedSilhouettes,
  ])

  const value = useMemo(
    () => ({
      resultsBySilhouette: results,
      rankedMedoids,
      representativeLinks,
      representativeWeights,
      revealFadedIDs,
      revealedSilhouettes,
      progress,
      status,
      error,
      pause,
      resume,
      cancel,
    }),
    [
      results,
      rankedMedoids,
      representativeLinks,
      representativeWeights,
      revealFadedIDs,
      revealedSilhouettes,
      progress,
      status,
      error,
      pause,
      resume,
      cancel,
    ],
  )

  return <ClusteringContext.Provider value={value}>{children}</ClusteringContext.Provider>
}

export function useClustering() {
  const context = useContext(ClusteringContext)
  if (!context) {
    throw new Error("useClustering must be used within a ClusteringProvider")
  }
  return context
}
