import { useEffect, useRef, useState, useCallback } from "react"

/**
 * useCluster
 *
 * Runs DBSCAN + PCA inside a Web Worker and returns ready-to-plot data.
 *
 * Usage:
 *   const { points, meta, status, error, run } = useCluster(workerUrl);
 *   run(raw, { epsilon: 10, minPts: 3 });
 *
 * @param {string} workerUrl  - URL / path to clusterWorker.js
 *                              e.g. new URL('./clusterWorker.js', import.meta.url)
 *
 * Returns:
 *   points  — Array<ClusterPoint>   ready for D3 / recharts / canvas
 *   meta    — ClusterMeta | null
 *   status  — 'idle' | 'running' | 'done' | 'error'
 *   error   — string | null
 *   run     — (raw, params?) => void   trigger a new run
 */

// ─── types (JSDoc) ──────────────────────────────────────────────────────────
/**
 * @typedef {{ id: string, value: number[][], size?: number }} RawEntry
 *
 * @typedef {{
 *   index:   number,
 *   id:      string,
 *   coords:  number[],
 *   cluster: number,   // -1 = noise
 *   x:       number,   // PCA PC1
 *   y:       number,   // PCA PC2
 * }} ClusterPoint
 *
 * @typedef {{
 *   nClusters:    number,
 *   nNoise:       number,
 *   explainedVar: string,
 *   nPoints:      number,
 *   nGroups:      number,
 *   maxDim:       number,
 *   kDistances:   number[],
 * }} ClusterMeta
 */

// ─── default params ──────────────────────────────────────────────────────────
const DEFAULT_PARAMS = { epsilon: 10, minPts: 3 }

// ─── hook ────────────────────────────────────────────────────────────────────
export function useDBSCANWorker() {
  const workerRef = useRef(null)

  const [points, setPoints] = useState(/** @type {ClusterPoint[]} */ ([]))
  const [meta, setMeta] = useState(/** @type {ClusterMeta|null} */ (null))
  const [status, setStatus] = useState(/** @type {'idle'|'running'|'done'|'error'} */ ("idle"))
  const [error, setError] = useState(/** @type {string|null} */ (null))

  // lazily create the worker once
  useEffect(() => {
    const w = new Worker(new URL("../../../utils/workers/dbscan.worker.js", import.meta.url))
    workerRef.current = w
    return () => w.terminate()
  }, [])

  // wire up the response handler every time (keeps closure fresh)
  useEffect(() => {
    const w = workerRef.current
    if (!w) return

    const onMessage = (e) => {
      const msg = e.data
      if (msg.type === "result") {
        setPoints(msg.points)
        setMeta(msg.meta)
        setStatus("done")
        setError(null)
      } else if (msg.type === "error") {
        setError(msg.message)
        setStatus("error")
      }
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
  }, [])

  /**
   * Trigger a clustering run.
   * @param {RawEntry[]} raw
   * @param {{ epsilon?: number, minPts?: number }} [params]
   */
  const run = useCallback((raw, params = {}) => {
    const w = workerRef.current
    if (!w) {
      setError("Worker not initialised")
      setStatus("error")
      return
    }

    setStatus("running")
    setError(null)

    w.postMessage({
      raw,
      epsilon: params.epsilon ?? DEFAULT_PARAMS.epsilon,
      minPts: params.minPts ?? DEFAULT_PARAMS.minPts,
    })
  }, [])

  return { points, meta, status, error, run }
}
