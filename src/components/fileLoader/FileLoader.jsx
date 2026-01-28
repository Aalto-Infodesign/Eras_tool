import { useState, useEffect, useMemo } from "react"
import LoadDataset from "./LoadDataset"
import { StateSelection } from "./StateSelection"
import { ProcessButton } from "./ProcessButton"

import "./FileLoader.css"
import { FlowChart } from "./flowChart/FlowChart"
import { Sankey } from "./flowChart/FlowSankey"
import { ScatterPlot } from "./scatterPlot/ScatterPlot"
import { StatesMatrix } from "./statesMatrix/StatesMatrix"

import { ReactFlowProvider } from "@xyflow/react"
import { AnimatePresence, motion } from "motion/react"

import { useData } from "../../contexts/ProcessedDataContext"
import { useViz } from "../../contexts/VizContext"

export function FileLoader({}) {
  const {
    richData,
    silhouettes,
    idealSilhouettes,
    setIdealSilhouettes,
    clusterStates,
    setClusterStates,
  } = useData()
  const { setIsLegend, statesOrder, isLegend } = useViz()

  const [isOpen, setIsOpen] = useState(true)

  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] })

  // const [clusterStates, setClusterStates] = useState(false)

  // Reset isLegend when new data is loaded
  useEffect(() => {
    if (richData.length > 0) {
      // Reset isLegend when new data is loaded
      if (isLegend) {
        setIsLegend(false)
        setIsOpen(true) // Ensure the accordion is open when returning to data loading state
      }
    }
  }, [richData])

  // Ensure accordion is open when transitioning back from legend mode
  useEffect(() => {
    if (!isLegend) {
      setIsOpen(true)
    }
  }, [isLegend])

  // useEffect(() => {
  //   const i = performance.now()
  //   console.log("Data Processing Triggered")
  //   data.length > 0 &&
  //     !isLegend &&
  //     // dataProcessing(data, statesOrder, scales, newDataset, newVizParameters, idealSilhouettes)
  //     useDataProcessing()
  //   const f = performance.now()
  //   console.log(`Data Processing Finished in ${f - i} ms`)
  // }, [data])

  const handleClick = () => {
    // dataProcessing(data, statesOrder, scales, newDataset, newVizParameters, idealSilhouettes)

    setIdealSilhouettes(idealSilhouettes)
  }

  const legendClass = isLegend ? "corner" : "center"
  const openClass = isOpen ? "open" : "closed"

  const filterSection = document.querySelector("section.filter")

  // const [idealSilhouettes, setIdealSilhouettes] = useState(null)

  const idealSilhouettesData = useMemo(
    () =>
      silhouettes.length > 0 ? silhouettes.filter((s) => idealSilhouettes.includes(s.name)) : [],
    [silhouettes, idealSilhouettes],
  )

  return (
    <section
      className={`loader-wrapper ${legendClass} accordion ${openClass} 
    `}
      style={{
        padding: !richData.length ? "1rem" : "",
        width: filterSection ? filterSection.offsetWidth : "",
      }}
      // style={{width:isLegend && }}
    >
      <div className="accordion-header">
        <LoadDataset />

        {richData.length === 0 && (
          <div className="cluster-toggle">
            <label>
              <input
                type="checkbox"
                checked={clusterStates}
                onChange={(e) => setClusterStates(e.target.checked)}
              />
              Cluster together states that occurred at the same age
            </label>
          </div>
        )}
        {isLegend && (
          <span className="material-icons" onClick={() => setIsOpen(!isOpen)}>
            <svg width={10} height={10} viewBox="-2 -2 4 4">
              <path
                d="M-2,-1 L2,-1 L0,2 Z"
                className={`material-icons small animated`}
                style={{ transform: `${isOpen ? "rotate(180deg)" : "rotate(0deg)"}` }}
                fill="white"
              />
            </svg>
          </span>
        )}
      </div>

      {richData.length > 0 && (
        <div className="loader-main">
          <ReactFlowProvider>
            <div>
              <StateSelection />
              <AnimatePresence>
                {/* <ScatterPlot data={silhouettes} width={300} height={300} /> */}
                {sankeyData.nodes.length > 0 && isOpen && (
                  <motion.div
                    className="flow-data"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <StatesMatrix width={300} height={300} />
                    {sankeyData.links.length > 0 && (
                      <Sankey data={sankeyData} width={300} height={100} />
                    )}
                    {idealSilhouettesData.length > 0 && (
                      <div>
                        <h4>Silhouettes found in dataset</h4>
                        {idealSilhouettesData.map((s) => (
                          <p key={s.name} className="ideal-silhouette-info">
                            <strong>{s.name}</strong>
                            <span> : {s.size}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {idealSilhouettesData.length === 0 && <h4>No silhouettes found in dataset</h4>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!isLegend && <FlowChart setSankeyData={setSankeyData} />}
          </ReactFlowProvider>
        </div>
      )}

      {statesOrder.length > 0 && richData.length > 0 && !isLegend && (
        <ProcessButton setIsLegend={setIsLegend} setIsOpen={setIsOpen} onClickEvent={handleClick} />
      )}
    </section>
  )
}
