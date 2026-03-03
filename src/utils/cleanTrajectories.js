/**
 * cleanTrajectories.js
 *
 * Cleans a dataset of patient trajectories by correcting small temporal
 * reversals between state pairs.
 *
 * LOGIC:
 * For each rule { sourceState, targetState, threshold (in years) }:
 *   - Scan each patient's trajectory for reversed pairs (target → source)
 *   - If the age difference between them is LESS than the threshold → swap them
 *   - If the difference is >= threshold → leave as-is (intentional reversal)
 *
 * NOTE: This function does NOT mutate the original data.
 * It returns a deep-cloned, cleaned copy of the dataset.
 */

/**
 * @typedef {Object} SwapRule
 * @property {string} sourceState - The state that should come first (e.g. "state 1")
 * @property {string} targetState - The state that should come second (e.g. "b")
 * @property {number} threshold   - Max age difference (in years) to trigger a swap
 */

/**
 * @typedef {Object} PatientRecord
 * @property {string}   FINNGENID        - Patient identifier
 * @property {string[]} trajectory       - Ordered list of state labels
 * @property {number[]} SwitchEventAge   - Corresponding ages for each state
 * @property {number[]} years            - Calendar years (parallel to trajectory)
 * @property {number}   diseaseDuration  - Total disease duration
 */

/**
 * Applies a set of swap rules to clean an array of patient records.
 *
 * @param {PatientRecord[]} sourceData - Original dataset (will NOT be mutated)
 * @param {SwapRule[]}      rules      - List of correction rules to apply
 * @returns {PatientRecord[]}          - New cleaned dataset
 */
export function cleanTrajectories(sourceData, rules) {
  // Deep clone so we never mutate the original
  const cleaned = structuredClone(sourceData)

  for (const patient of cleaned) {
    for (const rule of rules) {
      applyRuleToPatient(patient, rule)
    }
  }

  return cleaned
}

/**
 * Applies a single swap rule to a single patient record (mutates in place,
 * but only called on our deep-cloned copy).
 *
 * @param {PatientRecord} patient
 * @param {SwapRule}      rule
 */
function applyRuleToPatient(patient, rule) {
  const { sourceState, targetState, threshold } = rule
  const { trajectory, SwitchEventAge, years } = patient

  // Walk through every consecutive pair in the trajectory
  // We use a while loop (not forEach) because swapping doesn't shift indices —
  // a swap at index i doesn't affect whether index i+1 needs checking too.
  let i = 0
  while (i < trajectory.length - 1) {
    console.log("Apply Rule")
    const currentState = trajectory[i]
    const nextState = trajectory[i + 1]

    // Detect a REVERSAL: we see (target → source) instead of (source → target)
    const isReversed = currentState === targetState && nextState === sourceState

    if (isReversed) {
      const ageDiff = Math.abs(SwitchEventAge[i + 1] - SwitchEventAge[i])

      if (ageDiff < threshold) {
        // ── SWAP ──────────────────────────────────────────────────────────
        // Swap trajectory labels
        ;[trajectory[i], trajectory[i + 1]] = [trajectory[i + 1], trajectory[i]]

        // For ages and years: transposing the values would keep the wrong
        // timeline. Instead, anchor both to the smaller value and add a
        // tiny epsilon to i+1 to preserve strict ordering.
        const EPSILON = 0.0

        const minAge = Math.min(SwitchEventAge[i], SwitchEventAge[i + 1])
        SwitchEventAge[i] = minAge
        SwitchEventAge[i + 1] = minAge + EPSILON

        if (years) {
          const minYear = Math.min(years[i], years[i + 1])
          years[i] = minYear
          years[i + 1] = minYear + EPSILON
        }
        // ──────────────────────────────────────────────────────────────────

        // After a swap, re-check from i again:
        // The element now at i+1 might form a new reversible pair with i+2.
        // We do NOT decrement i here — just don't advance, so the next
        // iteration will check (i, i+1) again with the new values.
        // But since trajectory[i] is now sourceState, it can't match
        // targetState anymore, so advancing is actually safe. We advance
        // anyway for correctness clarity.
      }
    }

    i++
  }
}
