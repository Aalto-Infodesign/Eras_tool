/**
 * clusterWorker.js
 * Web Worker: receives RAW data, returns clustered + PCA-projected points.
 *
 * POST message in:
 * {
 *   raw:     Array<{ id: string, value: number[][], size?: number }>,
 *   epsilon: number,   // DBSCAN radius
 *   minPts:  number,   // DBSCAN min neighbours
 * }
 *
 * POST message out (success):
 * {
 *   type: 'result',
 *   points: Array<{
 *     index:   number,   // original flat index
 *     id:      string,   // source group id
 *     coords:  number[], // aligned (padded) original coords (label col removed)
 *     cluster: number,   // -1 = noise, 1..n = cluster id
 *     x:       number,   // PCA PC1 projection
 *     y:       number,   // PCA PC2 projection
 *   }>,
 *   meta: {
 *     nClusters:    number,
 *     nNoise:       number,
 *     explainedVar: string,  // e.g. "78.4"  (percentage, as string)
 *     nPoints:      number,
 *     nGroups:      number,
 *     maxDim:       number,
 *     kDistances:   number[], // sorted k-th nearest distances for elbow plot
 *   }
 * }
 *
 * POST message out (error):
 * { type: 'error', message: string }
 */

/* eslint-disable no-restricted-globals */

// ─── helpers ────────────────────────────────────────────────────────────────

function euclidean(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2
  return Math.sqrt(s)
}

// ─── DBSCAN ──────────────────────────────────────────────────────────────────

function dbscan(pts, eps, minPts) {
  const n = pts.length
  const labels = new Array(n).fill(0) // 0 = unvisited
  let cid = 0

  // precompute neighbours once per point — O(n²) but avoids recomputing in BFS
  const neighbours = pts.map((p, i) =>
    pts.reduce((nb, _, j) => {
      if (euclidean(pts[i], pts[j]) <= eps) nb.push(j)
      return nb
    }, []),
  )

  for (let i = 0; i < n; i++) {
    if (labels[i] !== 0) continue
    if (neighbours[i].length < minPts) {
      labels[i] = -1
      continue
    }

    cid++
    labels[i] = cid
    const queue = [...neighbours[i]]

    while (queue.length) {
      const j = queue.shift()
      if (labels[j] === -1) labels[j] = cid // rescue border point
      if (labels[j] !== 0) continue // already assigned
      labels[j] = cid
      if (neighbours[j].length >= minPts) queue.push(...neighbours[j])
    }
  }

  return labels
}

// ─── PCA (SVD via Jacobi on covariance matrix) ───────────────────────────────
// Pure-JS, no deps, numerically stable for ≤ ~20 dimensions.

function pca2D(pts) {
  const n = pts.length
  const d = pts[0].length

  if (n < 2) return { proj: pts.map(() => ({ x: 0, y: 0 })), explainedVar: "0.0" }

  // 1. center
  const mean = Array(d).fill(0)
  for (const p of pts) for (let j = 0; j < d; j++) mean[j] += p[j] / n
  const X = pts.map((p) => p.map((v, j) => v - mean[j]))

  // 2. covariance matrix  C = Xᵀ X / n
  const C = Array.from({ length: d }, () => new Float64Array(d))
  for (const row of X)
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += (row[i] * row[j]) / n

  // 3. Jacobi eigendecomposition (symmetric matrix)
  //    Returns { values: number[], vectors: number[][] } sorted desc by eigenvalue
  function jacobiEigen(A, maxSweeps = 100) {
    const dim = A.length
    // work on a copy
    const a = A.map((r) => Float64Array.from(r))
    // V starts as identity
    const V = Array.from({ length: dim }, (_, i) =>
      Float64Array.from({ length: dim }, (_, j) => (i === j ? 1 : 0)),
    )

    for (let sweep = 0; sweep < maxSweeps; sweep++) {
      // find max off-diagonal element
      let maxVal = 0,
        p = 0,
        q = 1
      for (let i = 0; i < dim - 1; i++)
        for (let j = i + 1; j < dim; j++)
          if (Math.abs(a[i][j]) > maxVal) {
            maxVal = Math.abs(a[i][j])
            p = i
            q = j
          }

      if (maxVal < 1e-12) break // converged

      // compute rotation angle
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
      const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(1 + theta ** 2))
      const c = 1 / Math.sqrt(1 + t * t)
      const s = t * c

      // update a
      const app = a[p][p],
        aqq = a[q][q],
        apq = a[p][q]
      a[p][p] = app - t * apq
      a[q][q] = aqq + t * apq
      a[p][q] = 0
      a[q][p] = 0
      for (let r = 0; r < dim; r++) {
        if (r !== p && r !== q) {
          const arp = a[r][p],
            arq = a[r][q]
          a[r][p] = a[p][r] = c * arp - s * arq
          a[r][q] = a[q][r] = s * arp + c * arq
        }
      }
      // update eigenvectors
      for (let r = 0; r < dim; r++) {
        const vrp = V[r][p],
          vrq = V[r][q]
        V[r][p] = c * vrp - s * vrq
        V[r][q] = s * vrp + c * vrq
      }
    }

    // eigenvalues are diagonal of a, eigenvectors are columns of V
    const pairs = Array.from({ length: dim }, (_, i) => ({
      value: a[i][i],
      vector: Array.from({ length: dim }, (_, j) => V[j][i]),
    })).sort((a, b) => b.value - a.value)

    return pairs
  }

  const eigen = jacobiEigen(C)
  const pc1 = eigen[0].vector
  const pc2 = (eigen[1] ?? eigen[0]).vector

  // 4. project
  const proj = X.map((row) => ({
    x: parseFloat(row.reduce((s, v, j) => s + v * pc1[j], 0).toFixed(3)),
    y: parseFloat(row.reduce((s, v, j) => s + v * pc2[j], 0).toFixed(3)),
  }))

  // 5. explained variance
  const totalVar = eigen.reduce((s, e) => s + Math.max(0, e.value), 0)
  const explained =
    totalVar > 0 ? (((eigen[0].value + (eigen[1]?.value ?? 0)) / totalVar) * 100).toFixed(1) : "0.0"

  return { proj, explainedVar: explained }
}

// ─── k-distance graph helper ─────────────────────────────────────────────────

function kthDistances(pts, k) {
  return pts
    .map((p, i) => {
      const dists = pts.map((q, j) => (i === j ? Infinity : euclidean(p, q))).sort((a, b) => a - b)
      return parseFloat(dists[Math.min(k - 1, dists.length - 1)].toFixed(3))
    })
    .sort((a, b) => a - b)
}

// ─── main pipeline ───────────────────────────────────────────────────────────

function process({ raw, epsilon, minPts }) {
  // 1. flatten — drop the last column (label) from each row
  const allPoints = raw.flatMap((entry) =>
    entry.value.map((row) => ({
      id: entry.id,
      coords: row.slice(0, -1), // drop label col
    })),
  )

  const rawCoords = allPoints.map((p) => p.coords)

  // 2. align to same dimensionality — pad short rows with column means
  const maxDim = Math.max(...rawCoords.map((r) => r.length))

  const colMeans = Array(maxDim)
    .fill(0)
    .map((_, j) => {
      const vals = rawCoords.filter((r) => r[j] !== undefined).map((r) => r[j])
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    })

  const aligned = rawCoords.map((row) =>
    Array(maxDim)
      .fill(0)
      .map((_, j) => row[j] ?? colMeans[j]),
  )

  // 3. DBSCAN on aligned coords
  const clusterLabels = dbscan(aligned, epsilon, minPts)

  // 4. PCA 2D projection
  const { proj, explainedVar } = pca2D(aligned)

  // 5. k-distance for elbow plot (use minPts as k)
  const kDistances = kthDistances(aligned, minPts)

  // 6. assemble output
  const points = allPoints.map((pt, i) => ({
    index: i,
    id: pt.id,
    coords: aligned[i],
    cluster: clusterLabels[i],
    x: proj[i].x,
    y: proj[i].y,
  }))

  const nClusters = Math.max(0, ...clusterLabels.filter((l) => l > 0))
  const nNoise = clusterLabels.filter((l) => l === -1).length
  const ids = [...new Set(allPoints.map((p) => p.id))]

  return {
    type: "result",
    points,
    meta: {
      nClusters,
      nNoise,
      explainedVar,
      nPoints: points.length,
      nGroups: ids.length,
      maxDim,
      kDistances,
    },
  }
}

// ─── worker message handler ──────────────────────────────────────────────────

self.onmessage = (e) => {
  try {
    const result = process(e.data)
    self.postMessage(result)
  } catch (err) {
    self.postMessage({ type: "error", message: err.message })
  }
}
