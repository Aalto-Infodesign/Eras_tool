import { useState, useEffect } from "react"
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

import { ChevronDown, Maximize2 } from "lucide-react"
import { useModifierKey } from "../hooks/useModifierKey"

export function FileLoader() {
  const { richData, existingIdealSilhouettes, clusterStates, setClusterStates, statesOrder } =
    useData()
  const { setIsLegend, isLegend, hasFlowChart, isSidePanelOpen } = useViz()

  const [isOpen, setIsOpen] = useState(true)

  useModifierKey("c", () => setIsOpen((prev) => !prev))

  useEffect(() => {
    if (!isLegend) {
      setIsOpen(true)
    }
  }, [isLegend])

  //TODO When sankey data changes, update useViz state and recreate palette using poset

  const legendClass = isLegend ? (isSidePanelOpen ? "corner-side" : "corner") : "center"
  const openClass = isOpen ? "open" : "closed"

  return (
    <motion.section
      className={`loader-wrapper ${legendClass} accordion ${openClass}
    `}
      style={{
        padding: !richData.length ? "1rem" : "",
      }}
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
          <div className="accordion-controls">
            <ChevronDown
              size={16}
              className="animated"
              onClick={() => setIsOpen(!isOpen)}
              transform={isOpen ? "rotate(180)" : "rotate(0)"}
            />
            <Maximize2 size={16} onClick={() => setIsLegend(false)} />
          </div>
        )}
      </div>

      {richData.length > 0 && (
        <div className="loader-main">
          <ReactFlowProvider>
            <div>
              <StateSelection />
              <AnimatePresence>
                {/* <ScatterPlot data={silhouettes} width={300} height={300} /> */}
                {isOpen && (
                  <motion.div
                    className="flow-data"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {/* <StatesMatrix width={300} height={300} /> */}

                    {hasFlowChart && <Sankey width={300} height={100} />}
                    {existingIdealSilhouettes.length > 0 && (
                      <div className="ideal-silhouette-info">
                        <h4>Silhouettes found in dataset</h4>
                        {existingIdealSilhouettes.map((s) => (
                          <p key={s.name}>
                            <strong>{s.name}</strong>
                            <span> : {s.size}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {existingIdealSilhouettes.length === 0 && hasFlowChart && !isLegend && (
                      <div>
                        <h4>No silhouettes found in dataset</h4>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <FlowChart />
          </ReactFlowProvider>
        </div>
      )}

      {statesOrder.length > 0 && richData.length > 0 && !isLegend && (
        <ProcessButton setIsOpen={setIsOpen} />
      )}
    </motion.section>
  )
}
