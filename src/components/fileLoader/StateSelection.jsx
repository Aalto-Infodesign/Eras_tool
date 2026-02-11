import { xor } from "lodash"
import { AnimatePresence, motion } from "motion/react"
import { Reorder } from "motion/react"
import { resolveCollisions } from "./flowChart/resolveCollisions"
import tinycolor from "tinycolor2"
import { useReactFlow } from "@xyflow/react"
import { useData } from "../../contexts/ProcessedDataContext"
import { useViz } from "../../contexts/VizContext"
import { ResetStatesOrder } from "./ResetStatesOrder"
import { X, Workflow, Plus } from "lucide-react"
import { useEffect, useCallback, useRef } from "react"

export function StateSelection() {
  const { removedStates, setRemovedStates, scales } = useData()
  const { palette, statesOrder, setStatesOrder, isLegend } = useViz()
  const { screenToFlowPosition, setNodes, getNodes, updateNodeData, deleteElements } =
    useReactFlow()

  const hasInitialized = useRef(false)

  // Centralized node creation function
  const createNode = useCallback(
    (stateIndex, position, nodeType = "default") => {
      const currentIndex = statesOrder.indexOf(stateIndex)
      const color = palette[stateIndex]

      return {
        id: `node_${Date.now()}_${Math.random()}`, // More unique ID
        type: nodeType,
        position,
        className: "dnd-node",
        style: { backgroundColor: color, padding: 10, borderRadius: 5 },
        data: {
          label: `${currentIndex} – ${scales.indexToName(stateIndex)}`,
          index: stateIndex,
          value: 100,
          category: "Disease || Drug",
          color: color,
        },
      }
    },
    [statesOrder, palette, scales],
  )

  // Auto-populate flowchart on first load
  useEffect(() => {
    if (!hasInitialized.current && statesOrder.length > 0) {
      hasInitialized.current = true

      const flowCenter = document.querySelector(".react-flow__viewport")?.getBoundingClientRect()
      if (!flowCenter) return

      const centerPosition = screenToFlowPosition({
        x: flowCenter.left + flowCenter.width / 2,
        y: flowCenter.top + flowCenter.height / 2,
      })

      const newNodes = statesOrder.map((stateIndex, i) => {
        // Offset nodes in a grid pattern or stacked
        const offset = {
          x: (i % 3) * 150 - 150, // 3 columns
          y: Math.floor(i / 3) * 100 - 100, // Rows
        }

        return createNode(stateIndex, {
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
    }
  }, [statesOrder, screenToFlowPosition, createNode, setNodes])

  // Sync node labels when statesOrder changes
  useEffect(() => {
    const nodes = getNodes()

    nodes.forEach((node) => {
      if (node.data?.index !== undefined) {
        const currentIndex = statesOrder.indexOf(node.data.index)

        if (currentIndex !== -1) {
          const newLabel = `${currentIndex} – ${scales.indexToName(node.data.index)}`
          if (node.data.label !== newLabel) {
            updateNodeData(node.id, { label: newLabel })
          }
        }
      }
    })
  }, [statesOrder, getNodes, updateNodeData, scales])

  // Remove nodes when their state is removed
  useEffect(() => {
    const nodes = getNodes()
    const nodesToDelete = nodes.filter((node) => {
      if (node.data?.index !== undefined) {
        const stateName = scales.indexToName(node.data.index)
        return removedStates.includes(stateName)
      }
      return false
    })

    if (nodesToDelete.length > 0) {
      deleteElements({ nodes: nodesToDelete })
    }
  }, [removedStates, getNodes, deleteElements, scales])

  const toggleRemovedState = useCallback(
    (state) => {
      const newRemovedStates = xor(removedStates, [state])
      setRemovedStates(newRemovedStates)
    },
    [removedStates, setRemovedStates],
  )

  const onDragEnd = useCallback(
    (event, nodeType, stateIndex, color) => {
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
    (nodeType, stateIndex, color = "white") => {
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
          <AnimatePresence>
            {statesOrder.map((item, i) => (
              <Reorder.Item
                key={item}
                value={item}
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
                onDragEnd={(event) => onDragEnd(event, "default", item, palette[item])}
              >
                <EraLabel index={i} text={scales.indexToName(item)} color={palette[item]} />

                <div className="buttons-wrapper">
                  {!isLegend && (
                    <button
                      className="center"
                      onClick={() => addNodetoFlow("default", item, palette[item])}
                    >
                      <Workflow size={14} />
                    </button>
                  )}
                  {statesOrder.length > 1 && (
                    <button
                      className="center"
                      onClick={() => toggleRemovedState(scales.indexToName(item))}
                    >
                      <X size={14} />
                    </button>
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
            <AnimatePresence>
              {removedStates.map((s, i) => (
                <motion.li key={s} layout className="state-item">
                  <EraLabel index={i} text={s} color={"#fff"} />
                  <button className="center" onClick={() => toggleRemovedState(s)}>
                    <Plus size={14} />
                  </button>
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

function EraLabel({ index, text, color }) {
  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <span>{index} –</span>
      <motion.span
        initial={{ color: color, marginLeft: "-5px" }}
        animate={{ color: color, marginLeft: "5px" }}
        exit={{ marginLeft: "0px" }}
      >
        {text}
      </motion.span>
    </motion.p>
  )
}
