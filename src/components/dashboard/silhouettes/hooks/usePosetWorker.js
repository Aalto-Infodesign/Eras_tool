import { useEffect, useState } from "react"
import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"

export function usePosetWorker() {
  const { silhouettes } = useData()
  const { startLoading, stopLoading } = useViz()
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!silhouettes) return

    startLoading()
    const worker = new Worker(new URL("./workers/poset.worker.js", import.meta.url))

    const cleanData = JSON.parse(JSON.stringify(silhouettes))

    worker.postMessage({ silhouettes: cleanData })

    worker.onmessage = ({ data }) => {
      setResult(data)
      stopLoading()

      worker.terminate() // Clean up after specific task if not reused
    }

    worker.onerror = (err) => {
      console.error("Worker Error:", err)
      stopLoading()
    }

    return () => worker.terminate()
  }, [silhouettes, startLoading, stopLoading])

  return { result }
}
