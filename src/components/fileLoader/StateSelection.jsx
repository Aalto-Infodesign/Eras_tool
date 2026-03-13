import { useEffect, useCallback } from "react"
import { xor } from "lodash"
import { AnimatePresence, motion } from "motion/react"
import { Reorder } from "motion/react"
import { resolveCollisions } from "./flowChart/resolveCollisions"
import tinycolor from "tinycolor2"
import { useReactFlow } from "@xyflow/react"
import { useRawData } from "../../contexts/RawDataContext"
import { useData } from "../../contexts/ProcessedDataContext"
import { useViz } from "../../contexts/VizContext"
import { ResetStatesOrder } from "./ResetStatesOrder"
import { X, Workflow, Plus } from "lucide-react"
import Button from "../common/Button/Button"

export function StateSelection() {
  const { fileName } = useRawData()

  const { removedStates, toggleRemovedState, statesData, statesOrder, setStatesOrder } = useData()
  const { palette, isLegend, hasFlowChart } = useViz()
  const {
    screenToFlowPosition,
    setNodes,
    getNodes,
    setEdges,
    updateNodeData,
    deleteElements,
    fitView,
  } = useReactFlow()

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

  // Auto-populate flowchart on first load or RawData change
  useEffect(() => {
    // RESET
    setNodes([])
    setEdges([])

    if (statesData.statesNames.length === 0) return

    const states = statesData.statesNames

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
  }, [fileName])

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
    duration: 0.2,
    delay: 0,
    ease: [0, 0.71, 0.2, 1.01],
  }

  const gap = 4
  const itemHeight = 26
  const statesLength = statesOrder.length
  const divHeight = statesLength > 0 ? statesLength * itemHeight + statesLength * gap : 0
  const removedDivHeight =
    removedStates.length > 0 ? removedStates.length * itemHeight + removedStates.length * gap : 0

  return (
    <motion.section className="accordion-content" layout>
      <p className="era-header">
        <span> i </span>
        <span>era</span>
        {/* <span>population</span> */}
      </p>
      <motion.div
        layout
        className="list-wrapper scroll-shadows"
        initial={{
          borderBottom: removedStates.length === 0 ? "none" : "0.5px solid var(--surface-light)",
          height: divHeight < 250 ? divHeight : 250,
        }}
        animate={{
          borderBottom: removedStates.length === 0 ? "none" : "0.5px solid var(--surface-light)",
          height: divHeight < 250 ? divHeight : 250,
        }}
      >
        <Reorder.Group
          className="states-list"
          axis="y"
          onReorder={setStatesOrder}
          values={statesOrder}
        >
          <AnimatePresence mode="popLayout">
            {statesOrder.map((item, i) => (
              <Reorder.Item
                key={item}
                value={item}
                id={`reorder-${item}`}
                as="div"
                className="state-item drag"
                whileTap={{ scale: 1.02 }}
                whileHover={{
                  backgroundColor: "#" + tinycolor(palette[item]).toHex() + "33",
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
                  population={statesData.statesObject[item]?.population_size}
                  color={palette[item]}
                />

                <div className="buttons-wrapper">
                  {!isLegend && hasFlowChart && (
                    <Button
                      size="xs"
                      className="center"
                      onClick={() => addNodetoFlow("default", item)}
                    >
                      <Workflow size={14} />
                    </Button>
                  )}
                  {statesOrder.length > 1 && (
                    <Button size="xs" className="center" onClick={() => toggleRemovedState(item)}>
                      <X size={14} />
                    </Button>
                  )}
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </motion.div>

      {removedStates.length > 0 && (
        <motion.div
          layout
          className="list-wrapper scroll-shadows"
          initial={{
            height: 0,
            padding: "0",
            border: "none",
          }}
          animate={{
            height: removedDivHeight < 150 ? removedDivHeight : 150,
            padding: removedStates.length === 0 ? "0" : "",
            border: removedStates.length > 0 ? "" : "none",
          }}
          exit={{
            height: 0,
            padding: "0",
            border: "none",
          }}
        >
          <motion.ul layout className="removed-states">
            <AnimatePresence mode="popLayout">
              {removedStates.map((s, i) => (
                <motion.li key={s} layout className="state-item">
                  <EraLabel index={i} text={s} color={"#fff"} />
                  <Button size="xs" className="center" onClick={() => toggleRemovedState(s)}>
                    <Plus size={14} />
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </motion.div>
      )}

      {isLegend && <ResetStatesOrder />}
    </motion.section>
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
