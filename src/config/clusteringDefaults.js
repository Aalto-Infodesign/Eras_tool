/**
 * Default params for newClustering.worker.js — single source of truth shared by
 * the worker (fallback merge) and the settings UI (initial values / reset).
 */
export const CLUSTERING_DEFAULTS = {
  bandwidth: null, // null → estimated per silhouette (bandwidthFactor × mean pairwise distance)
  bandwidthFactor: 0.3,
  mergeFactor: 2, // × bandwidth — higher merges more clusters (lower resolution)
  maxSeeds: 500, // unique rows converged per silhouette
  maxIteration: 100,
  epsilon: 1e-4,
  scoreSampleLimit: 500,
}
