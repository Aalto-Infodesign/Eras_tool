import { useFilters } from "../../contexts/FiltersContext"
import { useData } from "../../contexts/ProcessedDataContext"
import Button from "../common/Button/Button"
import { useClusteringWorker } from "../hooks/workerHooks/useClusteringWorker"
import styles from "./ClusteringView.module.css"
import { uniq } from "lodash"

export function ClusteringView() {
  const { selectedStep, stepIndex, totalSteps, advance, before, isDone } = useClusteringWorker()
  const { silhouettes } = useData()
  const { IDsFromClustering } = useFilters()

  console.log(IDsFromClustering)

  return (
    <div className={styles.clusteringView}>
      <div className="buttons-wrapper">
        <Button size="xs">Table</Button>
        <Button size="xs">Plot</Button>
      </div>

      <p>Steps {stepIndex + 1}</p>
      <p>Steps computed: {totalSteps}</p>
      {selectedStep && <p>Silhouettes: {selectedStep.length}</p>}
      <div className={styles.tableWrapper}>
        {selectedStep && (
          <table>
            <tbody>
              <tr>
                <th>Name</th>
                <th>Winner</th>
                <th>IDs</th>
                <th>Mean</th>
                <th>Bandwidth</th>
                <th>Assignments</th>
                <th>Stable</th>
              </tr>
              {selectedStep.map((l, i) => {
                if (!l.value) return null

                const silhouette = silhouettes.find((s) => s.name === l.value.id)
                console.log("silhouette", silhouette)
                const ids = silhouette.trajectories.map((t) => t[0].id)

                const winner = IDsFromClustering[i]

                return (
                  <tr key={"row" - l.value.id} style={{ opacity: l.value.stable ? 0.6 : 1 }}>
                    <td>{l.value.id}</td>
                    <td>{l.value.centers.length}</td>
                    <td>
                      <p key={"id-" + winner}>{winner}</p>
                    </td>

                    <td>{l.value.mean.toFixed(3)}</td>
                    <td>{l.value.bandwidth}</td>
                    <td>
                      {uniq(l.value.assignments).map((a) => (
                        <p>{a}</p>
                      ))}
                    </td>
                    <td>{l.value.stable ? "✓ stable" : "…"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="buttons-wrapper">
        <Button size="small" onClick={before} disabled={stepIndex === 0} keystroke="ArrowLeft">
          {"→ Previous bandwidth step "}
        </Button>
        <Button
          size="small"
          onClick={advance}
          disabled={isDone && stepIndex === totalSteps - 1}
          keystroke="ArrowRight"
        >
          {isDone && stepIndex === totalSteps - 1 ? "Done" : "Next bandwidth step →"}
        </Button>
      </div>
    </div>
  )
}
