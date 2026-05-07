import { useState, useEffect } from "react"
import LoadDataset from "./LoadDataset"
import { StateSelection } from "./StateSelection"
import { ProcessButton } from "./ProcessButton"

import "./FileLoader.css"
import { FlowChart } from "./flowChart/FlowChart"
import { Sankey } from "./flowChart/FlowSankey"

import { ReactFlowProvider } from "@xyflow/react"
import { AnimatePresence, motion } from "motion/react"

import { useData } from "../../contexts/ProcessedDataContext"
import { useViz } from "../../contexts/VizContext"

import { ChevronDown, Maximize2, User } from "lucide-react"
import Button from "../common/Button/Button"

import { ClusteringView } from "../clustering/ClusteringView"
import { features } from "../../config/features"

export function FileLoader() {
  const { richData, existingIdealSilhouettes, clusterStates, setClusterStates, statesOrder } =
    useData()
  const { setIsLegend, isLegend, hasFlowChart, isSidePanelOpen } = useViz()

  const [isOpen, setIsOpen] = useState(true)
  const [mode, setMode] = useState("flow") // || "flow"

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
      // layout="size"
      className={`loader-wrapper ${legendClass} accordion ${openClass}`}
      style={{
        padding: !richData.length ? "1rem" : "",
      }}
    >
      <motion.div layout className="accordion-header">
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

        {richData.length > 0 && (
          <div className="accordion-controls">
            {isLegend && (
              <Button
                tooltip={isOpen ? "Collapse Panel" : "Expand Panel"}
                tooltipPosition="left"
                size="xs"
                variant="transparent"
                keystroke="c"
                onClick={() => setIsOpen((prev) => !prev)}
              >
                <ChevronDown size={16} transform={isOpen ? "rotate(180)" : "rotate(0)"} />
              </Button>
            )}

            {isLegend ? (
              <Button
                tooltip={"Expand State Manager"}
                tooltipPosition="left"
                size="xs"
                variant="transparent"
                onClick={() => setIsLegend(false)}
              >
                <Maximize2 size={16} />
              </Button>
            ) : (
              <ProcessButton setIsOpen={setIsOpen} />
            )}
          </div>
        )}
      </motion.div>

      {richData.length > 0 && (
        <motion.div layout className="loader-main">
          <ReactFlowProvider>
            <motion.div layout className="states-selection">
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

                    <p>
                      There are
                      <b>{richData.length}</b>
                      <User size={14} />
                      in the dataset
                    </p>

                    {hasFlowChart && <Sankey width={300} height={100} />}
                    {existingIdealSilhouettes.length > 0 && (
                      <div className="ideal-silhouette-info">
                        <h4>Silhouettes found in dataset</h4>
                        {existingIdealSilhouettes.map((s) => (
                          <p key={s.name}>
                            <strong>{s.name}</strong>
                            <span> : {s.size} </span>
                            <User size={12} />
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
            </motion.div>
            {!isLegend && (
              <motion.div
                // key={mode}
                layout
                className="secondary-tools"
                style={{
                  minWidth: 500,
                  maxWidth: 800,
                  display: "flex",
                  placeContent: "center",
                  flexDirection: "column",
                  gap: "var(--spacing-sm)",
                }}
              >
                {mode === "flow" && <FlowChart />}

                {mode === "cluster" && features.clusters && <ClusteringView />}
                {features.clusters && (
                  <div className="buttons-wrapper">
                    <Button
                      size="xs"
                      onClick={() => setMode("flow")}
                      keystroke={"f"}
                      data-selected={mode === "flow"}
                    >
                      Flow
                    </Button>
                    <Button
                      size="xs"
                      onClick={() => setMode("cluster")}
                      keystroke={"c"}
                      data-selected={mode === "cluster"}
                    >
                      Cluster
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </ReactFlowProvider>
        </motion.div>
      )}
    </motion.section>
  )
}
