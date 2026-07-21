/**
 * Pure accessors over the clustering worker's per-silhouette results (see
 * newClustering.worker.js for the message shape, surfaced as
 * `resultsBySilhouette` — a Map<silhouetteName, result> — by useClustering()).
 *
 * Lookups key off `medoidID` rather than `cluster`: `cluster` is only a local
 * index within its silhouette's result, while `medoidID` is itself a
 * trajectory ID and therefore already unique across the whole dataset.
 */

// { silhouette, cluster } for the cluster whose medoid is `medoidID`, or null.
export function getClusterByMedoidID(results, medoidID) {
  for (const result of results.values()) {
    const cluster = result.clusters.find((c) => c.medoidID === medoidID)
    if (cluster) return { silhouette: result.id, cluster }
  }
  return null
}

// Trajectory IDs hard-assigned to the cluster represented by `medoidID`.
export function getMembersFromCluster(results, medoidID) {
  return getClusterByMedoidID(results, medoidID)?.cluster.memberIDs ?? []
}

// Member count of the cluster represented by `medoidID`.
export function getClusterSizeFromMedoid(results, medoidID) {
  return getClusterByMedoidID(results, medoidID)?.cluster.size ?? 0
}

// { silhouette, assignment } for a trajectory's hard cluster assignment plus
// its soft membership weights, or null if the trajectory hasn't been
// clustered (yet).
export function getClusterForTrajectory(results, trajectoryID) {
  for (const result of results.values()) {
    const assignment = result.assignments.find((a) => a.trajectoryID === trajectoryID)
    if (assignment) return { silhouette: result.id, assignment }
  }
  return null
}
