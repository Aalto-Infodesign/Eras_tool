import { useState, useEffect } from "react"
import LoadDataset from "./loadDataset"
import { StateSelection } from "./StateSelection"
import { ProcessButton } from "./ProcessButton"

import { dataProcessing } from "../../utils/dataProcessing"

import { isNil } from "lodash"

import "./FileLoader.css"
import { FlowChart } from "./flowChart/FlowChart"
import { Sankey } from "./flowChart/FlowSankey"
import { ScatterPlot } from "./scatterPlot/ScatterPlot"
import { StatesMatrix } from "./statesMatrix/StatesMatrix"

import { ReactFlowProvider } from "@xyflow/react"
import { AnimatePresence, motion } from "motion/react"

export function FileLoader({
  newDataset,
  statesOrder,
  setStatesOrder,
  statesOrderOriginal,
  setStatesOrderOriginal,
  isLegend,
  setIsLegend,
  silhouettes,
  idealSilhouettes,
  setIdealSilhouettes,
}) {
  const [loadedData, setLoadedData] = useState([])
  const [workingData, setWorkingData] = useState([])
  const [conversionScales, setConversionScales] = useState()
  const [palette, setPalette] = useState({})
  const [isOpen, setIsOpen] = useState(true)

  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] })

  const [clusterStates, setClusterStates] = useState(false)

  // const [idealSilhouettes, setIdealSilhouettes] = useState(null)

  console.log("sankeyData:", sankeyData)

  const idealSilhouettesData = silhouettes.filter((s) => idealSilhouettes.includes(s.name))
  console.log("Filtered ideal silhouettes data in FileLoader:", idealSilhouettesData)

  // Reset isLegend when new data is loaded
  useEffect(() => {
    if (loadedData.length > 0) {
      setWorkingData(loadedData)
      // Reset isLegend when new data is loaded
      if (isLegend) {
        setIsLegend(false)
        setIsOpen(true) // Ensure the accordion is open when returning to data loading state
      }
    }
  }, [loadedData])

  // Ensure accordion is open when transitioning back from legend mode
  useEffect(() => {
    if (!isLegend) {
      setIsOpen(true)
    }
  }, [isLegend])

  // useEffect(() => {
  //   console.log("Current ideal silhouettes in FileLoader:", idealSilhouettes)
  // }, [idealSilhouettes])

  useEffect(() => {
    const i = performance.now()
    console.log("Data Processing Triggered")
    workingData.length > 0 &&
      !isNil(conversionScales) &&
      dataProcessing(
        workingData,
        statesOrder,
        newDataset,
        conversionScales,
        palette,
        idealSilhouettes,
      )
    const f = performance.now()
    console.log(`Data Processing Finished in ${f - i} ms`)
  }, [workingData, conversionScales])

  const handleClick = () => {
    dataProcessing(
      workingData,
      statesOrder,
      newDataset,
      conversionScales,
      palette,
      idealSilhouettes,
    )
  }

  const legendClass = isLegend ? "corner" : "center"
  const openClass = isOpen ? "open" : "closed"

  const filterSection = document.querySelector("section.filter")

  return (
    <section
      className={`loader-wrapper ${legendClass} accordion ${openClass} 
    `}
      style={{
        padding: workingData.length === 0 ? "1rem" : "",
        width: filterSection ? filterSection.offsetWidth : "",
      }}
      // style={{width:isLegend && }}
    >
      <div className="accordion-header">
        <LoadDataset
          setLoadedData={setLoadedData}
          setWorkingData={setWorkingData}
          clusterStates={clusterStates}
        />

        {loadedData.length === 0 && (
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

      {loadedData.length > 0 && (
        <div className="loader-main">
          <ReactFlowProvider>
            <div>
              <StateSelection
                loadedData={loadedData}
                data={workingData}
                setWorkingData={setWorkingData}
                statesOrder={statesOrder}
                setStatesOrder={setStatesOrder}
                conversionScales={conversionScales}
                setConversionScales={setConversionScales}
                palette={palette}
                setPalette={setPalette}
                isLegend={isLegend}
                statesOrderOriginal={statesOrderOriginal}
                setStatesOrderOriginal={setStatesOrderOriginal}
              />
              <AnimatePresence>
                {/* <ScatterPlot data={silhouettes} width={300} height={300} /> */}
                <StatesMatrix
                  silhouettes={silhouettes}
                  statesOrder={statesOrder}
                  palette={palette}
                  width={300}
                  height={300}
                />
                {sankeyData.nodes.length > 0 && isOpen && (
                  <motion.div
                    className="flow-data"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Sankey
                      width={300}
                      height={100}
                      data={sankeyData}
                      setIdealSilhouettes={setIdealSilhouettes}
                    />
                    {idealSilhouettesData && idealSilhouettesData.length > 0 && (
                      <div>
                        <h4>Silhouettes found in dataset</h4>
                        {idealSilhouettesData.map((s) => (
                          <p key={s.name} className="ideal-silhouette-info">
                            <strong>{s.name}</strong>
                            <p>Quantity: {s.size}</p>
                          </p>
                        ))}
                      </div>
                    )}
                    {idealSilhouettesData.length === 0 && <h4>No silhouettes found in dataset</h4>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!isLegend && (
              <FlowChart setIdealSilhouettes={setIdealSilhouettes} setSankeyData={setSankeyData} />
            )}
          </ReactFlowProvider>
        </div>
      )}

      {statesOrder.length > 0 && workingData.length > 0 && !isLegend && (
        <ProcessButton setIsLegend={setIsLegend} setIsOpen={setIsOpen} onClickEvent={handleClick} />
      )}
    </section>
  )
}
