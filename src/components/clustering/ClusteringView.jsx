import styles from "./ClusteringView.module.css"
import { useDerivedData } from "../../contexts/DerivedDataContext"
import { useClustering } from "../../contexts/ClusteringContext"
import { motion } from "motion/react"
import Button from "../common/Button/Button"
import { FileDown, Pause, Play } from "lucide-react"

// TSV of every individual in the silhouette: hard assignment + one membership
// column per cluster. Membership values are Gaussian-kernel weights (rows sum
// to 1), NOT calibrated probabilities; columns are labeled by cluster medoid.
function exportMembershipsTSV(result) {
  const clusterColumns = result.clusters.map((c) => `membership_${c.medoidID}`)
  const header = ["FINNGENID", "assigned_cluster_medoid", ...clusterColumns].join("\t")
  const rows = result.assignments.map((a) =>
    [
      a.trajectoryID,
      result.clusters[a.cluster].medoidID,
      ...a.memberships.map((p) => p.toFixed(6)),
    ].join("\t"),
  )

  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/tab-separated-values" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `memberships_${result.id.replace(/[^\w-]+/g, "_")}.tsv`
  link.click()
  URL.revokeObjectURL(url)
}

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
              <th>Export</th>
            </tr>
            {silhouettes.map((s) => {
              const r = resultsBySilhouette.get(s.name)

              console.log(r)
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
                  <td>
                    <Button
                      size="xs"
                      disabled={!r}
                      tooltip="Export memberships TSV"
                      onClick={() => exportMembershipsTSV(r)}
                    >
                      <FileDown size={12} />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
