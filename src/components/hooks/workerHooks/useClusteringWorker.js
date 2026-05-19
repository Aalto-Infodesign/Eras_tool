import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useViz } from "../../../contexts/VizContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { min } from "d3"
import { useFilters } from "../../../contexts/FiltersContext"

export function useClusteringWorker() {
  const { setIDsFromClustering } = useFilters()
  const { silhouettes } = useDerivedData()
  const { startLoading, stopLoading } = useViz()
  const workerRef = useRef(null)
  const [steps, setSteps] = useState([])
  const [isDone, setIsDone] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const waitingForWorker = useRef(false) // are we waiting for a new step?

  useEffect(() => {
    if (silhouettes.length === 0) return
    startLoading()
    const worker = new Worker(
      new URL("../../../utils/workers/clustering.worker.js", import.meta.url),
    )
    workerRef.current = worker
    worker.postMessage({ silhouettes })

    worker.onmessage = ({ data: message }) => {
      stopLoading()
      if (message.done) {
        setIsDone(true)
        worker.terminate()
        return
      }
      setSteps((prev) => {
        const next = [...prev, message.results]
        // if we were waiting for a new step, advance index now that it arrived
        if (waitingForWorker.current) {
          setStepIndex(next.length - 1)
          waitingForWorker.current = false
        }
        return next
      })
    }

    worker.onerror = (err) => {
      console.error("Worker error:", err)
      stopLoading()
    }

    return () => worker.terminate()
  }, [silhouettes])

  const advance = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      // pure navigation, no worker involved
      setStepIndex((i) => i + 1)
      return
    }

    if (!isDone && workerRef.current) {
      // side effect — safe here, we're in an event handler
      startLoading()
      workerRef.current.postMessage({ next: true })
      waitingForWorker.current = true
    }

    if (isDone) stopLoading()
  }, [stepIndex, steps.length, isDone])

  const before = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const selectedStep = steps[stepIndex]

  const closestIDS = useMemo(() => {
    if (!selectedStep) return null

    return silhouettes.map((s) => {
      const cluster = selectedStep.find((l) => l.value?.id === s.name)

      if (cluster) {
        const lowestDist = min(cluster.value.distances)
        const lowestIndex = cluster.value.distances.indexOf(lowestDist)
        const ids = s.trajectories.map((t) => t[0].id)
        return ids[lowestIndex]
      }

      // Not yet computed — pick a random trajectory
      const ids = s.trajectories.map((t) => t[0].id)
      return ids[Math.floor(Math.random() * ids.length)]
    })
  }, [selectedStep, silhouettes])

  useEffect(() => {
    if (closestIDS) setIDsFromClustering(closestIDS)
  }, [closestIDS])

  return { selectedStep, stepIndex, totalSteps: steps.length, advance, before, isDone }
}
