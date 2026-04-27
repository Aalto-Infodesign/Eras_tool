import { useEffect, useState } from "react"
import { useViz } from "../../../contexts/VizContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"

export function useClusteringWorker() {
  const { silhouettes } = useDerivedData()
  const { startLoading, stopLoading } = useViz()
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!silhouettes) return

    startLoading()
    const worker = new Worker(
      new URL("../../../utils/workers/clustering.worker.js", import.meta.url),
    )

    worker.postMessage({ silhouettes })

    worker.onmessage = ({ data }) => {
      setResult(data)
      console.log("WORKER DONE")
      stopLoading()

      worker.terminate() // Clean up after specific task if not reused
    }

    worker.onerror = (err) => {
      console.error("Worker Error:", err)
      stopLoading()
    }

    return () => worker.terminate()
  }, [silhouettes])

  return { result }
}
