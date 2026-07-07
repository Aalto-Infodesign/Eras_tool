import styles from "./ClusteringView.module.css"
import { useDerivedData } from "../../contexts/DerivedDataContext"
import { useClustering } from "../../contexts/ClusteringContext"
import { motion } from "motion/react"
import Button from "../common/Button/Button"
import { Pause, Play } from "lucide-react"

export function ClusteringView() {
  const { silhouettes } = useDerivedData()
  const { resultsBySilhouette, progress, status, error, pause, resume } = useClustering()

  const perc = (progress.done * 100) / progress.total

  const isRunning = status === "running"
  const isPaused = status === "paused"
  const canToggle = isRunning || isPaused

  return (
    <div className={styles.clusteringView}>
      <div className={styles.clusteringHeader}>
        <p>
          Status: {status} — {progress.done} / {progress.total}
          {error && ` — error: ${error}`}
        </p>
        <div className="buttons-wrapper">
          <Button
            size="xs"
            onClick={isRunning ? pause : resume}
            disabled={!canToggle}
            tooltip={isRunning ? "Pause clustering" : "Resume clustering"}
            tooltipPosition="left"
          >
            {isRunning ? <Pause size={12} /> : <Play size={12} />}
          </Button>
        </div>
      </div>
      <motion.div
        initial={{ height: 2 }}
        animate={{ background: "var(--surface-accent)", width: `${perc}%` }}
      />
      <div className={styles.tableWrapper}>
        <table>
          <tbody>
            <tr>
              <th>Silhouette</th>
              <th>Size</th>
              <th>Dims</th>
              <th>Clusters</th>
              <th>Repr.</th>
              <th>Mean sil. score</th>
              <th>Bandwidth</th>
              <th>Representative IDs</th>
              <th>ms</th>
            </tr>
            {silhouettes.map((s) => {
              const r = resultsBySilhouette.get(s.name)
              return (
                <tr key={s.name} style={{ opacity: r ? 1 : 0.5 }}>
                  <td>{s.name}</td>
                  <td>{s.size}</td>
                  <td>{r ? r.metrics.nDims : "…"}</td>
                  <td>{r ? r.metrics.nClusters : "…"}</td>
                  <td>{r ? r.metrics.nRepresentatives : "…"}</td>
                  <td>{r ? r.metrics.meanSilhouetteScore.toFixed(3) : "…"}</td>
                  <td>{r ? r.metrics.bandwidth.toFixed(3) : "…"}</td>
                  <td>{r ? r.representatives.map((x) => x.medoidID).join(", ") : "…"}</td>
                  <td>{r ? r.metrics.durationMs : "…"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
