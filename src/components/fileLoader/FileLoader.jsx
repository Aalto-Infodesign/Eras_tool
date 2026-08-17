import { useState, useEffect } from "react"
import LoadDataset from "./LoadDataset"
import { StateSelection } from "./StateSelection"
import { ProcessButton } from "./ProcessButton"

import "./FileLoader.css"
import { FlowChart } from "./flowChart/FlowChart"
import { Sankey } from "./flowChart/FlowSankey"

import { ReactFlowProvider } from "@xyflow/react"
import { AnimatePresence, easeOut, motion } from "motion/react"

import { useData } from "../../contexts/ProcessedDataContext"
import { useViz } from "../../contexts/VizContext"

import { ChevronDown, Maximize2, Settings, User } from "lucide-react"
import Button from "../common/Button/Button"

import { ClusteringView } from "../clustering/ClusteringView"
import { features } from "../../config/features"
import { ClusteringSettings } from "../settings/ClusteringSettings"

export function FileLoader() {
  const { richData, existingIdealSilhouettes, clusterStates, setClusterStates, statesOrder } =
    useData()
  const { setIsLegend, isLegend, hasFlowChart, isSidePanelOpen, isOpen, setIsOpen } = useViz()

  const [mode, setMode] = useState("flow") // || "flow"
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    if (!isLegend) {
      setIsOpen(true)
    }
  }, [isLegend])

  //TODO When sankey data changes, update useViz state and recreate palette using poset

  const legendClass = isLegend ? (isSidePanelOpen ? "corner side" : "corner") : "center"
  const openClass = isOpen ? "open" : "closed"

  const translateProps = {
    x: isLegend ? (isSidePanelOpen ? -220 : 0) : "-50%",
    y: isLegend ? 0 : "-50%",
  }

  // const settingsVariants = {
  //   hidden: {
  //     visibility: "hidden",
  //     opacity: 0,
  //     height: 0,
  //     transition: { duration: 0.15 },
  //   },
  //   visible: {
  //     visibility: "visible",
  //     opacity: 1,
  //     height: "auto",
  //     transition: { duration: 0.15 },
  //   },
  // }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          layout
          className={`loader-wrapper ${legendClass}`}
          initial={{ opacity: 0, ...translateProps }}
          animate={{
            opacity: 1,
            ...translateProps,
          }}
          exit={{ opacity: 0, ...translateProps }}
          transition={{ duration: 0.2, ease: easeOut }}
          style={{
            padding: !richData.length ? "1rem" : "",
          }}
        >
          <motion.div layout className="accordion-header">
            <LoadDataset />

            {/* {richData.length === 0 && (
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
            )} */}

            {/* <Button
              data-selected={isSettingsOpen}
              size="small"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
            >
              <Settings size={16} />
            </Button> */}

            {richData.length > 0 && (
              <div className="accordion-controls">
                {!isLegend && <ProcessButton setIsOpen={setIsOpen} />}
              </div>
            )}
          </motion.div>
          {/* <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                layout="position"
                variants={settingsVariants}
                initial="hidden"
                animate="visible"
                exit={"hidden"}
              >
                <ClusteringSettings />
              </motion.div>
            )}
          </AnimatePresence> */}
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
                    {/* // TODO Prevent Reset of Flowchert when re-mounting component */}
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
                        {/* <Button
                          size="xs"
                          onClick={() => setMode("cluster")}
                          keystroke={"c"}
                          data-selected={mode === "cluster"}
                        >
                          Cluster
                        </Button> */}
                      </div>
                    )}
                    {mode === "flow" && <FlowChart />}
                    {mode === "cluster" && features.clusters && <ClusteringView />}
                  </motion.div>
                )}
              </ReactFlowProvider>
            </motion.div>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
