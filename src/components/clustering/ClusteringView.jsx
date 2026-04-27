import Button from "../common/Button/Button"
import { useClusteringWorker } from "../hooks/workerHooks/useClusteringWorker"

export function ClusteringView() {
  const { steps, advance, isDone } = useClusteringWorker()

  const latest = steps[steps.length - 1] // most recent yield

  console.log(latest)

  return (
    <div>
      <p>Bandwidth steps computed: {steps.length}</p>

      {latest &&
        latest.map((l) => (
          <div>
            <p>Clusters found: {l.value.centers.length}</p>
            <p>Mean silhouette: {l.value.mean.toFixed(3)}</p>
            <p>Bandwidth: {l.value.bandwidth}</p>
          </div>
        ))}

      <Button onClick={advance} disabled={isDone}>
        {isDone ? "Done" : "Next bandwidth step →"}
      </Button>
    </div>
  )
}
