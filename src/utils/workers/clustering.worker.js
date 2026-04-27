/* eslint-disable no-restricted-globals */
function meanshift(array, bandwidth, k, i = 0, maxIteration = 100, epsilon = 1e-4) {
  // Euclidean distance between two points a and b (arrays of equal length)
  // _.reduce iterates over a, using the index (dim) to access both a and b simultaneously
  // accumulates the sum of squared differences across all dimensions, then square roots it
  const euclidean = (a, b) => Math.sqrt(a.reduce((sum, _, dim) => sum + (a[dim] - b[dim]) ** 2, 0))

  // Centroid of a cluster: average value per dimension across all points
  // cluster[0].map iterates over dimensions using the first point as a shape reference
  // for each dimension, sums all points' values at that dimension and divides by cluster size
  const centroid = (cluster) =>
    cluster[0].map((_, dim) => cluster.reduce((sum, p) => sum + p[dim], 0) / cluster.length)

  // If no initial kernel centers are provided, seed them from the input points themselves
  const range = k ?? array
  // console.log(range)
  // For each kernel center, collect all input points within `bandwidth` distance
  // then discard any empty neighbourhoods (kernels with no nearby points)
  const clusters = range
    .map((kernel) => array.filter((p) => euclidean(kernel, p) <= bandwidth))
    .filter((c) => c.length > 0)

  // Shift each kernel center to the centroid of its neighbourhood
  const shift = clusters.map(centroid)

  // Converged if every center moved less than epsilon from its previous position
  const stability = shift.every((s, n) => euclidean(s, range[n]) < epsilon)

  if (stability || i === maxIteration) {
    // Stringify before Set construction since JS Sets use reference equality for arrays
    return new Set(shift.map((s) => JSON.stringify(s)))
  } else {
    return meanshift(array, bandwidth, shift, i + 1, maxIteration, epsilon)
  }
}

function silhouette(array, bandwidth) {
  const result = meanshift(array, bandwidth)

  // Parse the stringified centers back to arrays
  const centers = [...result].map((s) => JSON.parse(s))

  const euclidean = (a, b) => Math.sqrt(a.reduce((sum, _, dim) => sum + (a[dim] - b[dim]) ** 2, 0))

  // Assign each point to its nearest center
  const assignments = array.map((p) => {
    const distances = centers.map((c) => euclidean(p, c))
    return distances.indexOf(Math.min(...distances))
  })

  const scores = array.map((p, idx) => {
    // if (idx !== 0) return
    const ownCluster = array.filter((_, j) => assignments[j] === assignments[idx])
    // console.log("ownCluster", ownCluster)

    // a: mean distance to all other points in the same cluster
    const a =
      ownCluster.length > 1
        ? ownCluster.reduce((sum, q) => sum + euclidean(p, q), 0) / (ownCluster.length - 1)
        : 0

    // console.log(
    //   "a",
    //   ownCluster.reduce((sum, q) => {
    //     console.log("p", p)
    //     console.log("q", q)
    //     console.log("euc", euclidean(p, q))
    //     return (sum + euclidean(p, q), 0)
    //   }),
    // )

    // b: mean distance to all points in the nearest other cluster
    const otherClusters = [...new Set(assignments)].filter((c) => c !== assignments[idx])
    if (otherClusters.length === 0) return 0
    const b = Math.min(
      ...otherClusters.map((c) => {
        const cluster = array.filter((_, j) => assignments[j] === c)
        return cluster.reduce((sum, q) => sum + euclidean(p, q), 0) / cluster.length
      }),
    )

    // silhouette score for this point
    return (b - a) / Math.max(a, b)
  })

  // Mean silhouette score across all points
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length

  return { mean, scores, assignments, centers }
}

//stability estimation
function qualityScore(input) {
  console.log(input)
  return true
}

function* pda(data) {
  const step = 1
  let l = 0
  let centroids = []
  let go = true
  const compare = (a, b) => a.map((e, n) => (b[n] ? b[n] === e : false)).every((e) => e)

  while (go) {
    l += step
    const silhouettes = silhouette(data, l)
    const newSet = [...meanshift(data, l)]

    if (centroids.length > 0 && compare(centroids, newSet)) {
      go = false // mark done, but still yield this last step
    }

    centroids = newSet // ← don't forget to update this each iteration!

    yield {
      centers: newSet,
      mean: silhouettes.mean,
      scores: silhouettes.scores,
      assignments: silhouettes.assignments,
      bandwidth: l,
      stable: !go, // bonus: tells the UI "this was the final step"
    }
  }
}
// const pda_data = pda(data)

let generators = []

self.onmessage = ({ data: message }) => {
  if (message.silhouettes) {
    const pdaData = message.silhouettes.map((s) =>
      s.trajectories.map((t) => t.map((tt) => [tt.speed])),
    )

    // one generator per dataset
    generators = pdaData.map((dataset) => pda(dataset))

    // advance all of them once to get the first step
    const results = generators.map((g) => g.next())
    self.postMessage({ results, done: results.every((r) => r.done) })
  }

  if (message.next && generators.length > 0) {
    const results = generators.map((g) => g.next())
    self.postMessage({ results, done: results.every((r) => r.done) })
  }
}
