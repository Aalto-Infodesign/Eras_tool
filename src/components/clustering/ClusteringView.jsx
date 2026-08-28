import styles from "./ClusteringView.module.css"
import { memo, useRef, useState } from "react"
import { useDerivedData } from "../../contexts/DerivedDataContext"
import { useClustering } from "../../contexts/ClusteringContext"
import { AnimatePresence, motion } from "motion/react"
import Button from "../common/Button/Button"
import { ClusteringSettings } from "../settings/ClusteringSettings"
import { Expand, FileDown, Pause, Play, SlidersHorizontal } from "lucide-react"
import { downloadIDs } from "../../utils/exportFunctions"
import { SilhouettePathSvg } from "../dashboard/silhouettes/shared/SilhouettePathSvg"
import { div } from "three/src/nodes/math/OperatorNode.js"
import { useFilters } from "../../contexts/FiltersContext"
import { Dialog } from "../common/Dialog/Dialog"
import { useCharts } from "../dashboard/main-charts/ChartsContext"

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
  const { selectedTrajectoriesIDs } = useFilters()
  const { chartHeight } = useCharts()

  const tableDialogRef = useRef(null)
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)

  const perc = (progress.done * 100) / progress.total

  const isRunning = status === "running"
  const isPaused = status === "paused"
  const canToggle = isRunning || isPaused

  const [showSettings, setShowSettings] = useState(false)

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
          <Button
            size="xs"
            variant={showSettings ? "primary" : "secondary"}
            onClick={() => setShowSettings((v) => !v)}
            tooltip="Clustering settings"
            tooltipPosition="bottom-left"
          >
            <SlidersHorizontal size={12} />
          </Button>
          <Button
            size="xs"
            onClick={() => {
              setIsTableDialogOpen(true)
              tableDialogRef.current?.showModal()
            }}
            tooltip="Expand table"
            tooltipPosition="bottom-left"
          >
            <Expand size={12} />
          </Button>
        </div>
      </div>
      <AnimatePresence>{showSettings && <ClusteringSettings />}</AnimatePresence>
      <motion.div
        initial={{ height: 2 }}
        animate={{ background: "var(--surface-accent)", width: `${perc}%` }}
      />

      <ClusteringTable
        styles={styles}
        silhouettes={silhouettes}
        selectedTrajectoriesIDs={selectedTrajectoriesIDs}
        resultsBySilhouette={resultsBySilhouette}
        height={chartHeight}
      />

      <Dialog ref={tableDialogRef} onClose={() => setIsTableDialogOpen(false)} title={"Clustering"}>
        {isTableDialogOpen && (
          <ClusteringTable
            styles={styles}
            silhouettes={silhouettes}
            selectedTrajectoriesIDs={selectedTrajectoriesIDs}
            resultsBySilhouette={resultsBySilhouette}
            isCompact={false}
          />
        )}
      </Dialog>
    </div>
  )
}

const ClusteringTable = ({
  styles,
  silhouettes,
  selectedTrajectoriesIDs,
  resultsBySilhouette,
  isCompact = true,
  height = "undefined",
}) => {
  return (
    <div className={styles.tableWrapper} style={{ height: height }}>
      <table>
        <tbody>
          <tr>
            <th>Silhouette</th>
            <th>Size</th>
            {/* <th>Dims</th> */}
            <th>Clusters</th>
            {/* <th>Repr.</th> */}
            {!isCompact && <th>Mean score</th>}
            {!isCompact && <th>BW</th>}
            <th>Representative IDs</th>
            <th>Export</th>
            {/* {!isCompact && <th>ms</th>} */}
          </tr>
          {silhouettes.map((s) => (
            <SilhouetteRow
              key={s.name}
              s={s}
              r={resultsBySilhouette.get(s.name)}
              selectedTrajectoriesIDs={selectedTrajectoriesIDs}
              isCompact={isCompact}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// One row per silhouette. Results stream in one silhouette at a time, so every
// message would otherwise re-render all N rows; memoizing keeps `r` referentially
// stable for already-settled silhouettes (their result object doesn't change),
// so only the newly-arrived row actually re-renders.
const SilhouetteRow = memo(function SilhouetteRow({
  s,
  r,
  selectedTrajectoriesIDs,
  isCompact = true,
}) {
  return (
    <tr style={{ opacity: r ? 1 : 0.5 }}>
      <td>
        <p>{s.name}</p>
        {/* <div className="silhouette-wrapper"> */}
        {/* <SilhouettePathSvg
          keyName="card"
          silhouetteName={s.name}
          animationDuration={0.2}
          strokeWidth={6}
          radius={3}
          size={55}
        /> */}
        {/* </div> */}
      </td>
      <td>{s.size}</td>
      {/* <td>{r ? r.metrics.nDims : "…"}</td> */}
      <td>{r ? r.metrics.nClusters : "…"}</td>
      {/* <td>{r ? r.metrics.nRepresentatives : "…"}</td> */}
      {!isCompact && <td>{r ? r.metrics.meanSilhouetteScore.toFixed(3) : "…"}</td>}
      {!isCompact && <td>{r ? r.metrics.bandwidth.toFixed(3) : "…"}</td>}
      <td>
        {r
          ? r.representatives.map((x) => (
              <div className="buttons-wrapper" style={{ placeContent: "space-between" }}>
                <Button
                  key={x.medoidID}
                  size="xs"
                  disabled={!r}
                  tooltip={`Export ${x.medoidID} members: ${x.size} ids`}
                  tooltipPosition="bottom-left"
                  onClick={(e) => downloadIDs(e, x.memberIDs)}
                  data-selected={selectedTrajectoriesIDs.includes(x.medoidID)}
                >
                  <p style={{ minWidth: "55px" }}>{x.medoidID}</p>
                  <FileDown size={12} />
                </Button>
              </div>
            ))
          : "..."}
      </td>
      <td>
        <Button
          size="xs"
          disabled={!r}
          tooltip={`Export memberships TSV: ${s.size} ids`}
          tooltipPosition="bottom-left"
          onClick={() => exportMembershipsTSV(r)}
        >
          <FileDown size={12} />
        </Button>
      </td>
      {/* {!isCompact && <td>{r ? r.metrics.durationMs : "…"}</td>} */}
    </tr>
  )
})
