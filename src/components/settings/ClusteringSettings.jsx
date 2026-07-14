/**
 * Draft/commit editor for the clustering worker params. Edits stay local until
 * Apply, which commits them to ClusteringContext and restarts the run — so
 * Apply with unchanged values doubles as a re-run button. Bandwidth `null`
 * means "auto": estimated per silhouette from bandwidthFactor.
 */

import { useState } from "react"
import styles from "./ClusteringSettings.module.css"
import { useClustering } from "../../contexts/ClusteringContext"
import { CLUSTERING_DEFAULTS } from "../../config/clusteringDefaults"
import Button from "../common/Button/Button"
import { max } from "lodash"
import { motion } from "motion/react"

const FIELDS = [
  {
    key: "bandwidthFactor",
    label: "Bandwidth factor",
    step: 0.05,
    min: 0.01,
    max: 1,
    hint: "× mean pairwise distance (used when bandwidth is auto)",
  },
  {
    key: "mergeFactor",
    label: "Merge factor",
    step: 0.1,
    min: 0.1,
    max: 10,
    hint: "× bandwidth — higher merges more clusters",
  },
  {
    key: "maxSeeds",
    label: "Max seeds",
    step: 10,
    min: 10,
    max: 1000,
    integer: true,
    hint: "unique rows converged per silhouette",
  },
]

export function ClusteringSettings() {
  const { params, applyParams } = useClustering()
  const [draft, setDraft] = useState(params)

  const isAutoBandwidth = draft.bandwidth === null
  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const apply = () => {
    const clean = { ...draft }
    for (const f of FIELDS) {
      if (!Number.isFinite(clean[f.key])) clean[f.key] = CLUSTERING_DEFAULTS[f.key]
      else if (f.integer) clean[f.key] = Math.round(clean[f.key])
    }
    if (clean.bandwidth !== null && !(clean.bandwidth > 0)) clean.bandwidth = null
    setDraft(clean)
    applyParams(clean)
  }

  const settingsVariants = {
    hidden: {
      visibility: "hidden",
      opacity: 0,
      height: 0,
      transition: { duration: 0.15 },
    },
    visible: {
      visibility: "visible",
      opacity: 1,
      height: "auto",
      transition: { duration: 0.15 },
    },
  }

  return (
    <motion.div
      className={styles.clusteringSettings}
      variants={settingsVariants}
      initial="hidden"
      animate="visible"
      exit={"hidden"}
    >
      <h4>Clustering settings</h4>
      <div className={styles.inputs}>
        <label className={styles.field} title="Auto: estimated per silhouette">
          <span className={styles.label}>Bandwidth</span>
          <span className={styles.bandwidthControls}>
            <label className={styles.auto}>
              <input
                type="checkbox"
                checked={isAutoBandwidth}
                onChange={(e) => setField("bandwidth", e.target.checked ? null : 1)}
              />
              auto
            </label>
            <input
              type="number"
              step={0.1}
              min={0}
              disabled={isAutoBandwidth}
              value={isAutoBandwidth ? "" : draft.bandwidth}
              placeholder="auto"
              onChange={(e) => setField("bandwidth", e.target.valueAsNumber)}
            />
          </span>
        </label>

        {FIELDS.map((f) => (
          <label key={f.key} className={styles.field} title={f.hint}>
            <span className={styles.label}>{f.label}</span>
            <input
              type="number"
              step={f.step}
              min={f.min}
              max={f.min}
              value={Number.isFinite(draft[f.key]) ? draft[f.key] : ""}
              onChange={(e) => setField(f.key, e.target.valueAsNumber)}
            />
            <input
              className={styles.generatorInput}
              type="range"
              step={f.step}
              min={f.min}
              max={f.max}
              value={Number.isFinite(draft[f.key]) ? draft[f.key] : ""}
              onChange={(e) => setField(f.key, e.target.valueAsNumber)}
            />
          </label>
        ))}
      </div>
      <div className={styles.actions}>
        <Button
          size="xs"
          variant="secondary"
          tooltip="Back to defaults (not applied yet)"
          onClick={() => setDraft(CLUSTERING_DEFAULTS)}
        >
          Reset
        </Button>
        <Button size="xs" tooltip="Restart clustering with these params" onClick={apply}>
          Apply
        </Button>
      </div>
    </motion.div>
  )
}
