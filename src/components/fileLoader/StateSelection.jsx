import { useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Reorder } from "motion/react"
import { resolveCollisions } from "./flowChart/resolveCollisions"
// import tinycolor from "tinycolor2"
import { useReactFlow } from "@xyflow/react"
import { useRawData } from "../../contexts/RawDataContext"
import { useData } from "../../contexts/ProcessedDataContext"
import { useViz } from "../../contexts/VizContext"
import { ResetStatesOrder } from "./ResetStatesOrder"
import { X, Workflow, Plus, PlusIcon, Trash } from "lucide-react"
import Button from "../common/Button/Button"
import { useFilters } from "../../contexts/FiltersContext"

export function StateSelection() {
  const { fileName } = useRawData()

  const { statesOrder, setStatesOrder } = useData()
  const { palette, isLegend, hasFlowChart } = useViz()
  const { removedStates, toggleRemovedState } = useFilters()
  const {
    screenToFlowPosition,
    setNodes,
    getNodes,
    setEdges,
    updateNodeData,
    deleteElements,
    fitView,
  } = useReactFlow()

  const nodes = getNodes()

  // Centralized node creation function
  const createNode = useCallback(
    (stateName, position, nodeType = "default") => {
      const currentIndex = statesOrder.indexOf(stateName)
      const color = palette[stateName]

      return {
        id: `node_${Date.now()}_${Math.random()}`, // More unique ID
        type: nodeType,
        position,
        className: "dnd-node",
        style: { backgroundColor: color, padding: 10, borderRadius: 5 },
        data: {
          label: `${currentIndex} – ${stateName}`,
          index: currentIndex,
          value: stateName,
          category: "category",
          color: color,
        },
      }
    },
    [statesOrder, palette],
  )

  useEffect(() => {
    // RESET
    resetFlowChart()
  }, [fileName])

  const resetFlowChart = useCallback(() => {
    setNodes([])
    setEdges([])
  }, [])

  const populateFlowChart = useCallback(() => {
    if (statesOrder.length === 0) return

    const states = statesOrder

    const flowCenter = document.querySelector(".react-flow__viewport")?.getBoundingClientRect()
    if (!flowCenter) return

    const centerPosition = screenToFlowPosition({
      x: flowCenter.left + flowCenter.width / 2,
      y: flowCenter.top + flowCenter.height / 2,
    })

    const newNodes = states.map((stateName, i) => {
      // Offset nodes in a grid pattern or stacked
      const offset = {
        x: (i % 3) * 150 - 150, // 3 columns
        y: Math.floor(i / 3) * 100 - 100, // Rows
      }

      return createNode(stateName, {
        x: centerPosition.x + offset.x,
        y: centerPosition.y + offset.y,
      })
    })

    setNodes((nds) =>
      resolveCollisions([...nds, ...newNodes], {
        maxIterations: Infinity,
        overlapThreshold: 0.5,
        margin: 10,
      }),
    )

    fitView()
  }, [statesOrder])

  // Sync node labels when statesOrder changes
  useEffect(() => {
    const nodes = getNodes()

    nodes.forEach((node) => {
      if (node.data?.value !== undefined) {
        const currentIndex = statesOrder.indexOf(node.data.value)

        if (currentIndex !== -1) {
          const newLabel = `${currentIndex} – ${node.data.value}`
          if (node.data.label !== newLabel) {
            updateNodeData(node.id, { label: newLabel })
          }
        }
      }
    })
  }, [statesOrder, updateNodeData, removedStates, getNodes])

  // Remove nodes when their state is removed
  useEffect(() => {
    const nodes = getNodes()

    const nodesToDelete = nodes.filter((node) => {
      if (node.data?.value !== undefined) {
        const stateName = node.data.value
        return removedStates.includes(stateName)
      }
      return false
    })

    if (nodesToDelete.length > 0) {
      deleteElements({ nodes: nodesToDelete })
    }

    fitView()
  }, [removedStates, deleteElements, getNodes])

  const onDragEnd = useCallback(
    (event, nodeType, stateIndex) => {
      if (isLegend) return

      const { clientX, clientY } = event
      const flowBounds = document.querySelector(".react-flow")?.getBoundingClientRect()

      if (!flowBounds) return

      const isInside =
        clientX >= flowBounds.left &&
        clientX <= flowBounds.right &&
        clientY >= flowBounds.top &&
        clientY <= flowBounds.bottom

      if (isInside) {
        const position = screenToFlowPosition({ x: clientX, y: clientY })
        const newNode = createNode(stateIndex, position, nodeType)
        setNodes((nds) => nds.concat(newNode))
      }
    },
    [isLegend, screenToFlowPosition, createNode, setNodes],
  )

  const addNodetoFlow = useCallback(
    (nodeType, stateIndex) => {
      const flowCenter = document.querySelector(".react-flow__viewport")?.getBoundingClientRect()

      if (!flowCenter) return

      const position = screenToFlowPosition({
        x: flowCenter.left + flowCenter.width / 2,
        y: flowCenter.top + flowCenter.height / 2,
      })

      const newNode = createNode(stateIndex, position, nodeType)

      setNodes((nds) =>
        resolveCollisions([...nds, newNode], {
          maxIterations: Infinity,
          overlapThreshold: 0.5,
          margin: 10,
        }),
      )

      fitView()
    },
    [screenToFlowPosition, createNode, setNodes],
  )

  const transition = {
    duration: 0.3,
    delay: 0,
    ease: "easeOut",
  }

  return (
    <section className="accordion-content">
      {!isLegend && (
        <div className="buttons-wrapper">
          <Button
            size="xs"
            onClick={populateFlowChart}
            disabled={nodes.length > 0}
            tooltip={"Add all states in the Expectation Flowchart"}
            tooltipPosition="right"
          >
            <PlusIcon size={16} />
            Add all
          </Button>
          <Button
            size="xs"
            onClick={resetFlowChart}
            disabled={nodes.length === 0}
            tooltip={"Clear Expectation Flowchart"}
            tooltipPosition="right"
          >
            <Trash size={16} />
            Clear flowchart
          </Button>
        </div>
      )}
      <motion.div layout="size" transition={transition}>
        {/* Top list */}
        <motion.div
          layout="size"
          key={"top-list"}
          className="list-wrapper"
          layoutDependency={removedStates}
          // animate={{
          //   borderBottom:
          //     removedStates.length === 0 ? "none" : "0.5px solid var(--surface-tertiary)",
          // }}
          transition={transition}
        >
          <Reorder.Group
            className="states-list"
            axis="y"
            onReorder={setStatesOrder}
            values={statesOrder}
          >
            <AnimatePresence>
              {statesOrder.map((item, i) => (
                <Reorder.Item
                  key={item}
                  value={item}
                  // layoutId={item}
                  id={`reorder-${item}`}
                  as="div"
                  className="state-item drag"
                  whileTap={{ scale: 1.02 }}
                  initial={{ opacity: 0 }}
                  animate={{ backgroundColor: "var(--surface-primary)", opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{
                    // backgroundColor: "#" + tinycolor(palette[item]).toHex() + "33",
                    backgroundColor: "var(--surface-secondary)",
                    transition: { duration: 0.1 },
                  }}
                  whileDrag={{ zIndex: 100 }}
                  drag
                  layout
                  transition={transition}
                  onDragEnd={(event) => onDragEnd(event, "default", item)}
                >
                  <EraLabel
                    index={i}
                    text={item}
                    // population={statesData.statesObject[item]?.population_size}
                    color={palette[item]}
                  />
                  <div className="buttons-wrapper">
                    {!isLegend && hasFlowChart && (
                      <Button
                        size="xs"
                        className="center"
                        onClick={() => addNodetoFlow("default", item)}
                        tooltip={"Add to flowchart"}
                        tooltipPosition="left"
                      >
                        <Workflow size={14} />
                      </Button>
                    )}
                    {statesOrder.length > 1 && (
                      <Button
                        size="xs"
                        className="center"
                        onClick={() => toggleRemovedState(item)}
                        tooltip={"Remove state"}
                        tooltipPosition="left"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </motion.div>

        {/* Bottom list */}
        <AnimatePresence mode="popLayout">
          {removedStates.length > 0 && (
            <motion.div
              key="removed-wrapper"
              layoutDependency={removedStates}
              layout="size"
              className="list-wrapper "
              transition={transition}
            >
              <ul className="removed-states">
                {removedStates.map((s, i) => (
                  <motion.li
                    key={s}
                    // layoutId={s}
                    layout
                    className="state-item"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                  >
                    <EraLabel index={i} text={s} color={"#fff"} />
                    <Button size="xs" className="center" onClick={() => toggleRemovedState(s)}>
                      <Plus size={14} />
                    </Button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {isLegend && <ResetStatesOrder />}
    </section>
  )
}

function EraLabel({ index, text, color, population }) {
  return (
    <motion.p
      className="era-label"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <span>{index} –</span>
      <motion.span
        initial={{ color: color, marginLeft: "-5px" }}
        animate={{ color: color, marginLeft: "0px" }}
        exit={{ marginLeft: "0px" }}
      >
        {text}
      </motion.span>
      {/* {population && <span>{population}</span>} */}
    </motion.p>
  )
}
