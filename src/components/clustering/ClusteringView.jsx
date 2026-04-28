import Button from "../common/Button/Button"
import { useClusteringWorker } from "../hooks/workerHooks/useClusteringWorker"
import styles from "./ClusteringView.module.css"
import { uniq } from "lodash"

export function ClusteringView() {
  const { steps, advance, isDone } = useClusteringWorker()

  const latest = steps[steps.length - 1] // most recent yield

  console.log(steps)

  return (
    <div className={styles.clusteringView}>
      <div className="buttons-wrapper">
        <Button size="xs">Table</Button>
        <Button size="xs">Plot</Button>
      </div>

      <p>Bandwidth steps computed: {steps.length}</p>
      {latest && (
        <table>
          <tbody>
            <tr>
              <th>Name</th>
              <th>Clusters</th>
              <th>Mean</th>
              <th>Bandwidth</th>
              <th>Assignments</th>
            </tr>
            {latest.map((l) => {
              if (!l.value) return
              return (
                <tr key={l.value.id}>
                  <td> {l.value.id}</td>
                  <td>{l.value.centers.length}</td>
                  <td> {l.value.mean.toFixed(3)}</td>
                  <td> {l.value.bandwidth}</td>
                  <td> {uniq(l.value.assignments).length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <Button size="small" onClick={advance} disabled={isDone}>
        {isDone ? "Done" : "Next bandwidth step →"}
      </Button>
    </div>
  )
}
