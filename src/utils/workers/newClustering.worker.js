/* eslint-disable no-restricted-globals */
/**
 * newClustering.worker.js
 * Progressive per-silhouette mean-shift clustering on duration matrices
 * (rows = trajectories, columns = duration between consecutive states).
 *
 * POST message in:
 * { type: 'run', runId: number,
 *   matrices: Array<{ id: string, ids: string[], matrix: number[][] }>,
 *   params?: { bandwidth?, bandwidthFactor?, mergeFactor?, diversityFactor?,
 *              maxSeeds?, maxIteration?, epsilon?, scoreSampleLimit? } }
 * { type: 'pause' }   // halt after the current silhouette, keep queue position
 * { type: 'resume' }  // continue a paused run from where it stopped
 * { type: 'cancel' }  // abandon the run entirely
 *
 * POST message out (streamed, largest silhouette first):
 * { type: 'silhouette-partial', runId, index, total, id,
 *   medoidIDs: string[] }  // modes discovered so far within this silhouette (faded preview)
 * { type: 'silhouette-result', runId, index, total, id,
 *   clusters: Array<{ cluster, center, size, medoidIndex, medoidID }>,
 *   assignments: Array<{ trajectoryID, cluster }>,
 *   medoidIDs: string[],
 *   // diversity-pruned + percentage-capped display subset of clusters:
 *   representatives: Array<{ medoidID, medoidIndex, cluster, size, representedSize }>,
 *   medianMedoidID: string,  // representative with the median total duration (reveal highlight)
 *   metrics: { nClusters, nRepresentatives, meanSilhouetteScore, bandwidth, size, nDims, durationMs } }
 * { type: 'done', runId }
 * { type: 'error', runId, id?, index?, total?, message }
 */

import { extent } from "d3"
import { flatten } from "lodash"

const DEFAULTS = {
  bandwidth: null, // null → estimated per silhouette
  bandwidthFactor: 0.3,
  mergeFactor: 0.5,
  diversityFactor: 20.0, // min medoid-to-medoid distance for the display subset, × bandwidth
  maxSeeds: 500,
  maxIteration: 100,
  epsilon: 1e-4,
  scoreSampleLimit: 500,
}

// ─── distance helpers ────────────────────────────────────────────────────────

const squED = (a, b) => a.reduce((acc, v, n) => acc + (v - b[n]) ** 2, 0)
const euclidean = (a, b) => Math.sqrt(squED(a, b))

const getMedoid = (data, kernel) => [...data].sort((a, b) => squED(a, kernel) - squED(b, kernel))[0]

// Deterministic subsample: every k-th element, spanning the whole array
function strideSample(arr, limit) {
  if (arr.length <= limit) return arr
  const step = arr.length / limit
  const out = []
  for (let i = 0; i < limit; i++) out.push(arr[Math.floor(i * step)])
  return out
}

// ─── mean-shift ──────────────────────────────────────────────────────────────

function pointwiseMeanshift(data, bandwidth, kernelCenter, maxIteration = 100, epsilon = 1e-4) {
  const sqBandwidth = bandwidth * bandwidth
  let center = kernelCenter
  let nn = data.filter((row) => squED(center, row) <= sqBandwidth)

  while (maxIteration-- > 0 && nn.length > 0) {
    const newCenter = nn
      .reduce((acc, el) => acc.map((dim, n) => el[n] + dim)) //Sigma
      .map((e) => e / nn.length) //Ratio

    if (euclidean(center, newCenter) <= epsilon) break

    // a shifted center can land in an empty region: converge on the previous state
    const newNN = data.filter((row) => squED(newCenter, row) <= sqBandwidth)
    if (newNN.length === 0) break

    center = newCenter
    nn = newNN
  }

  return { kernelCenter: center, medoid: getMedoid(nn.length > 0 ? nn : data, center) }
}

// ─── pipeline helpers ────────────────────────────────────────────────────────

function estimateBandwidth(matrix, factor = 0.3, sampleLimit = 300) {
  const sample = strideSample(matrix, sampleLimit)
  let sum = 0
  let count = 0
  for (let i = 0; i < sample.length; i++)
    for (let j = i + 1; j < sample.length; j++) {
      sum += euclidean(sample[i], sample[j])
      count++
    }
  const meanDist = count > 0 ? sum / count : 0
  return Math.max(factor * meanDist, 1e-9)
}

// Duration vectors repeat heavily, so this typically collapses many rows
function uniqueRows(matrix) {
  const seen = new Map()
  matrix.forEach((row, index) => {
    const key = JSON.stringify(row)
    if (!seen.has(key)) seen.set(key, { row, index })
  })
  return [...seen.values()]
}

// Greedy merge of converged centers within threshold, as weighted running mean
function mergeCenters(centers, threshold) {
  const merged = []
  for (const center of centers) {
    const near = merged.find((m) => euclidean(m.center, center) < threshold)
    if (near) {
      near.center = near.center.map((v, n) => (v * near.count + center[n]) / (near.count + 1))
      near.count++
    } else {
      merged.push({ center: [...center], count: 1 })
    }
  }
  return merged.map((m) => m.center)
}

// Greedy diversity prune over the final medoids (real rows, not centers): keep
// the most relevant clusters first, absorb any whose medoid sits within
// `threshold` euclidean of an already-kept medoid. Returns survivors with the
// absorbed cluster sizes folded into `representedSize`, sorted by it desc.

// ! (max-min)/n x ogni silhouettes
function pruneMedoids(clusters, matrix, threshold) {
  const ordered = [...clusters].sort((a, b) => b.size - a.size)
  const kept = []
  for (const c of ordered) {
    const row = matrix[c.medoidIndex]
    const near = kept.find((k) => euclidean(matrix[k.medoidIndex], row) < threshold)
    if (near) {
      near.representedSize += c.size
    } else {
      kept.push({
        medoidID: c.medoidID,
        medoidIndex: c.medoidIndex,
        cluster: c.cluster,
        size: c.size,
        representedSize: c.size,
      })
    }
  }
  return kept.sort((a, b) => b.representedSize - a.representedSize)
}

function meanSilhouetteScore(matrix, assignments, sampleLimit = 500) {
  const clusterIDs = [...new Set(assignments)]
  if (clusterIDs.length < 2) return 0

  const members = new Map(clusterIDs.map((c) => [c, []]))
  assignments.forEach((c, i) => members.get(c).push(i))

  const indices = strideSample(
    matrix.map((_, i) => i),
    sampleLimit,
  )

  let sum = 0
  for (const i of indices) {
    const own = members.get(assignments[i])

    // a: mean distance to all other points in the same cluster
    const a =
      own.length > 1
        ? own.reduce((s, j) => (j === i ? s : s + euclidean(matrix[i], matrix[j])), 0) /
          (own.length - 1)
        : 0

    // b: mean distance to all points in the nearest other cluster
    let b = Infinity
    for (const c of clusterIDs) {
      if (c === assignments[i]) continue
      const cluster = members.get(c)
      const mean = cluster.reduce((s, j) => s + euclidean(matrix[i], matrix[j]), 0) / cluster.length
      if (mean < b) b = mean
    }

    sum += (b - a) / Math.max(a, b) || 0 // identical points: a = b = 0 → 0
  }

  return sum / indices.length
}

// ─── per-silhouette pipeline (chunked, mode-discovery streaming) ─────────────

// Distinct display subset + median highlight + metrics, from final clusters.
function buildResult(item, params, { assignments, clusters, bandwidth, t, t0 }) {
  const { id, ids, matrix } = item
  const n = matrix.length
  const d = matrix[0]?.length ?? 0

  // Prune near-duplicate medoids, then cap to the silhouette's share of the
  // whole dataset (47% → ≤ 47 medoids), ≥ 1.
  let representatives = pruneMedoids(clusters, matrix, t)
  const pct = params.totalTrajectories ? (n / params.totalTrajectories) * 100 : 100
  const maxMedoids = 3
  // const maxMedoids = Math.max(1, Math.round(pct))
  representatives = representatives.slice(0, maxMedoids)

  // The "median" representative for the reveal: order displayed medoids by total
  // duration (sum of the row), pick the middle one.
  const sumRow = (i) => matrix[i].reduce((s, v) => s + v, 0)
  const byDuration = [...representatives].sort(
    (a, b) => sumRow(a.medoidIndex) - sumRow(b.medoidIndex),
  )
  const medianMedoidID = byDuration.length
    ? byDuration[Math.floor(byDuration.length / 2)].medoidID
    : null

  return {
    id,
    clusters,
    representatives,
    medianMedoidID,
    assignments: ids.map((tid, i) => ({ trajectoryID: tid, cluster: assignments[i] })),
    medoidIDs: clusters.map((c) => c.medoidID),
    metrics: {
      nClusters: clusters.length,
      nRepresentatives: representatives.length,
      meanSilhouetteScore: meanSilhouetteScore(matrix, assignments, params.scoreSampleLimit),
      bandwidth,
      size: n,
      nDims: d,
      durationMs: Math.round(performance.now() - t0),
    },
  }
}

// Steps 4–7: merge converged centers → assign all rows → per-cluster medoid.
function finalizeFromConverged(item, params, sil) {
  const { matrix, ids } = item
  const { converged, bandwidth, t, t0 } = sil

  const centers = mergeCenters(
    converged.map((c) => c.kernelCenter),
    bandwidth * params.mergeFactor,
  )

  const rawAssignments = matrix.map((row) => {
    let best = 0
    let bestDist = Infinity
    centers.forEach((c, k) => {
      const dist = squED(row, c)
      if (dist < bestDist) {
        bestDist = dist
        best = k
      }
    })
    return best
  })

  const used = [...new Set(rawAssignments)].sort((a, b) => a - b)
  const reindex = new Map(used.map((c, k) => [c, k]))
  const assignments = rawAssignments.map((c) => reindex.get(c))

  const clusters = used.map((orig, k) => {
    const center = centers[orig]
    let medoidIndex = -1
    let bestDist = Infinity
    let size = 0
    assignments.forEach((c, i) => {
      if (c !== k) return
      size++
      const dist = squED(matrix[i], center)
      if (dist < bestDist) {
        bestDist = dist
        medoidIndex = i
      }
    })
    return { cluster: k, center, size, medoidIndex, medoidID: ids[medoidIndex] }
  })

  return buildResult(item, params, { assignments, clusters, bandwidth, t, t0 })
}

// Online greedy merge of a converged center into the running modes; returns true
// when it forms a NEW mode (so the scheduler knows to emit an updated preview).
function mergeModeOnline(modes, center, matrix, ids, threshold) {
  const near = modes.find((m) => euclidean(m.center, center) < threshold)
  if (near) {
    near.center = near.center.map((v, n) => (v * near.count + center[n]) / (near.count + 1))
    near.count++
    return false
  }
  // new mode → its medoid is the closest row to the center (over all rows)
  let medoidIndex = 0
  let best = Infinity
  for (let i = 0; i < matrix.length; i++) {
    const dist = squED(matrix[i], center)
    if (dist < best) {
      best = dist
      medoidIndex = i
    }
  }
  modes.push({ center: [...center], count: 1, medoidIndex, medoidID: ids[medoidIndex] })
  return true
}

// Begin a silhouette: returns { result } for degenerate cases, else { working }.
function startSilhouette(item, params) {
  const { ids, matrix } = item
  const n = matrix.length
  const t0 = performance.now()

  //TODO Threshold value should depend on silhouette size
  const matrixExtent = extent(flatten(matrix))
  const t = ((matrixExtent[1] - matrixExtent[0]) / Math.max(1, n)) * params.diversityFactor

  if (n === 0) {
    return {
      result: buildResult(item, params, { assignments: [], clusters: [], bandwidth: 0, t, t0 }),
    }
  }

  let seeds = uniqueRows(matrix)

  // Degenerate: single trajectory or all-identical rows (e.g. one-state silhouettes)
  if (n === 1 || seeds.length === 1) {
    const clusters = [
      { cluster: 0, center: [...matrix[0]], size: n, medoidIndex: 0, medoidID: ids[0] },
    ]
    return {
      result: buildResult(item, params, {
        assignments: new Array(n).fill(0),
        clusters,
        bandwidth: 0,
        t,
        t0,
      }),
    }
  }

  const bandwidth = params.bandwidth ?? estimateBandwidth(matrix, params.bandwidthFactor)
  if (seeds.length > params.maxSeeds) seeds = strideSample(seeds, params.maxSeeds)

  return { working: { item, bandwidth, t, t0, seeds, seedIndex: 0, converged: [], modes: [] } }
}

// ─── message handler + progressive scheduling ────────────────────────────────

const CHUNK_MS = 14 // time budget per macrotask: keep the worker responsive to pause/cancel

let currentRunId = null
let paused = false
// Holds the in-flight run so pause can halt mid-silhouette and resume can pick up
// from the same seed position. `sil` is the per-silhouette convergence state.
let runState = null // { runId, queue, index, params, sil }

function processNext() {
  if (!runState || runState.runId !== currentRunId) return // stale / cancelled: stop silently
  if (paused) return // halt at a chunk boundary; `resume` re-enters here

  const { runId, queue, index, params } = runState
  if (index >= queue.length) {
    self.postMessage({ type: "done", runId })
    runState = null
    return
  }

  const item = queue[index]
  try {
    if (!runState.sil) {
      // begin this silhouette
      const started = startSilhouette(item, params)
      if (started.result) {
        // degenerate → no convergence loop, emit the final result immediately
        self.postMessage({
          type: "silhouette-result",
          runId,
          index,
          total: queue.length,
          ...started.result,
        })
        runState.index = index + 1
        runState.sil = null
        setTimeout(processNext, 0)
        return
      }
      runState.sil = started.working
    }

    // converge a time-budgeted batch of seeds, discovering modes online
    const sil = runState.sil
    const { matrix, ids } = item
    const chunkStart = performance.now()
    let newMode = false
    do {
      const seed = sil.seeds[sil.seedIndex]
      const { kernelCenter } = pointwiseMeanshift(
        matrix,
        sil.bandwidth,
        seed.row,
        params.maxIteration,
        params.epsilon,
      )
      sil.converged.push({ kernelCenter })
      if (mergeModeOnline(sil.modes, kernelCenter, matrix, ids, sil.t)) newMode = true
      sil.seedIndex++
    } while (sil.seedIndex < sil.seeds.length && performance.now() - chunkStart < CHUNK_MS)

    if (newMode) {
      self.postMessage({
        type: "silhouette-partial",
        runId,
        index,
        total: queue.length,
        id: item.id,
        medoidIDs: sil.modes.map((m) => m.medoidID),
      })
    }

    if (sil.seedIndex >= sil.seeds.length) {
      // all seeds converged → authoritative result (unchanged logic)
      const result = finalizeFromConverged(item, params, sil)
      self.postMessage({ type: "silhouette-result", runId, index, total: queue.length, ...result })
      runState.index = index + 1
      runState.sil = null
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      runId,
      id: item.id,
      index,
      total: queue.length,
      message: err.message,
    })
    runState.index = index + 1
    runState.sil = null
  }

  // yield between chunks so pause / cancel / new run messages interleave
  setTimeout(processNext, 0)
}

self.onmessage = ({ data: msg }) => {
  if (msg.type === "cancel") {
    currentRunId = null
    runState = null
    paused = false
    return
  }

  if (msg.type === "pause") {
    paused = true
    return
  }

  if (msg.type === "resume") {
    if (paused) {
      paused = false
      processNext() // continue from the saved queue position
    }
    return
  }

  if (msg.type === "run") {
    currentRunId = msg.runId
    paused = false
    const queue = [...msg.matrices].sort((a, b) => b.matrix.length - a.matrix.length)
    // total across all silhouettes → per-silhouette percentage cap on medoids
    const totalTrajectories = msg.matrices.reduce((s, m) => s + m.matrix.length, 0)
    const params = { ...DEFAULTS, ...msg.params, totalTrajectories }
    runState = { runId: msg.runId, queue, index: 0, params, sil: null }
    processNext()
  }
}
