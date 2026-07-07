import { useEffect, useRef, useState, useCallback } from "react"

/**
 * useNewClusteringWorker
 *
 * Runs progressive per-silhouette mean-shift clustering inside a Web Worker.
 * Results stream in one silhouette at a time (largest first) and accumulate
 * in a Map keyed by silhouette name.
 *
 * Pause/resume is enforced on BOTH sides:
 *   - the worker is told to halt between silhouettes (saves CPU), and
 *   - the hook holds any results that still arrive while paused and flushes
 *     them on resume — so the UI freezes instantly and losslessly even though
 *     the worker can't be interrupted mid-silhouette.
 *
 * Returns:
 *   results  — Map<silhouetteName, { clusters, assignments, medoidIDs, metrics }>
 *   partials — Map<silhouetteName, string[]>  // modes discovered so far, pre-finalize
 *   progress — { done: number, total: number }
 *   status   — 'idle' | 'running' | 'paused' | 'done' | 'error'
 *   error    — string | null
 *   run      — (matrices, params?) => void
 *   pause    — () => void   halt after the current silhouette, keep progress
 *   resume   — () => void   continue a paused run, flushing held results
 *   cancel   — () => void
 *
 * `matrices` entries: { id: string, ids: string[], matrix: number[][] }
 */
export function useNewClusteringWorker() {
  const workerRef = useRef(null)
  const runIdRef = useRef(0)
  const pausedRef = useRef(false)
  const bufferRef = useRef([]) // results that arrived while paused

  const [results, setResults] = useState(() => new Map())
  const [partials, setPartials] = useState(() => new Map())
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState(null)

  useEffect(() => {
    const w = new Worker(new URL("../../../utils/workers/newClustering.worker.js", import.meta.url))
    workerRef.current = w
    return () => w.terminate()
  }, [])

  // Apply one worker message to React state (the actual UI mutation)
  const applyMessage = useCallback((msg) => {
    if (msg.type === "silhouette-partial") {
      setPartials((prev) => new Map(prev).set(msg.id, msg.medoidIDs))
    } else if (msg.type === "silhouette-result") {
      setResults((prev) => new Map(prev).set(msg.id, msg))
      // final supersedes the preview
      setPartials((prev) => {
        if (!prev.has(msg.id)) return prev
        const next = new Map(prev)
        next.delete(msg.id)
        return next
      })
      setProgress({ done: msg.index + 1, total: msg.total })
    } else if (msg.type === "done") {
      setStatus("done")
    } else if (msg.type === "error") {
      setError(msg.message)
      if (msg.id) {
        setProgress({ done: msg.index + 1, total: msg.total })
      } else {
        setStatus("error")
      }
    }
  }, [])

  useEffect(() => {
    const w = workerRef.current
    if (!w) return

    const onMessage = ({ data: msg }) => {
      if (msg.runId !== runIdRef.current) return // stale run
      // While paused, hold messages instead of mutating the UI; resume flushes them.
      if (pausedRef.current) {
        bufferRef.current.push(msg)
        return
      }
      applyMessage(msg)
    }

    const onError = (e) => {
      setError(e.message ?? "Worker error")
      setStatus("error")
    }

    w.addEventListener("message", onMessage)
    w.addEventListener("error", onError)
    return () => {
      w.removeEventListener("message", onMessage)
      w.removeEventListener("error", onError)
    }
  }, [applyMessage])

  const run = useCallback((matrices, params = {}) => {
    const w = workerRef.current
    if (!w) {
      setError("Worker not initialised")
      setStatus("error")
      return
    }

    runIdRef.current++
    pausedRef.current = false
    bufferRef.current = []
    setResults(new Map())
    setPartials(new Map())
    setProgress({ done: 0, total: matrices.length })
    setStatus("running")
    setError(null)

    w.postMessage({ type: "run", runId: runIdRef.current, matrices, params })
  }, [])

  const pause = useCallback(() => {
    pausedRef.current = true // freeze the UI immediately, before any more messages land
    workerRef.current?.postMessage({ type: "pause" })
    setStatus((s) => (s === "running" ? "paused" : s))
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    // flush anything the worker streamed before it could actually halt
    const held = bufferRef.current
    bufferRef.current = []
    held.forEach(applyMessage)
    workerRef.current?.postMessage({ type: "resume" })
    setStatus((s) => (s === "paused" ? "running" : s))
  }, [applyMessage])

  const cancel = useCallback(() => {
    pausedRef.current = false
    bufferRef.current = []
    setPartials(new Map())
    workerRef.current?.postMessage({ type: "cancel" })
    setStatus("idle")
  }, [])

  return { results, partials, progress, status, error, run, pause, resume, cancel }
}
