import { useEffect, useRef, useState, useCallback } from "react"
import { useViz } from "../../../contexts/VizContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"

export function useClusteringWorker() {
  const { silhouettes } = useDerivedData()
  const { startLoading, stopLoading } = useViz()
  const workerRef = useRef(null) // persist worker across renders
  const [steps, setSteps] = useState([]) // all yielded steps so far
  const [isDone, setIsDone] = useState(false)

  // const generateData = (size, dimensions) =>
  //   Array.from({ length: size }, () =>
  //     Array.from({ length: dimensions }, () => Math.random() * 100),
  //   )
  // const pdaData = generateData(40, 3)

  useEffect(() => {
    if (silhouettes.length === 0) return

    console.log("Worker start")
    startLoading()
    const worker = new Worker(
      new URL("../../../utils/workers/clustering.worker.js", import.meta.url),
    )
    workerRef.current = worker

    // Kick off — sends data and triggers first .next() inside worker
    worker.postMessage({ silhouettes })

    worker.onmessage = ({ data: message }) => {
      console.log("Worker stop")
      stopLoading()
      if (message.done) {
        setIsDone(true)
        worker.terminate()
        return
      }
      // Accumulate each step's result
      setSteps((prev) => [...prev, message.results])
    }

    worker.onerror = (err) => {
      console.error("Worker error:", err)
      stopLoading()
    }

    return () => worker.terminate()
  }, [silhouettes])

  // Call this from the UI to advance the generator one step
  const advance = useCallback(() => {
    if (workerRef.current && !isDone) {
      console.log("Worker advance")

      startLoading()
      workerRef.current.postMessage({ next: true })
    }
  }, [isDone])

  return { steps, advance, isDone }
}
