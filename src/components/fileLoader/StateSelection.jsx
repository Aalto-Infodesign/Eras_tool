import { xor } from "lodash"

import { AnimatePresence, motion } from "motion/react"

import { Reorder } from "motion/react"

import { resolveCollisions } from "./flowChart/resolveCollisions"

import tinycolor from "tinycolor2"

import { useReactFlow } from "@xyflow/react"

import { useViz } from "../../contexts/VizContext"
import { useData } from "../../contexts/ProcessedDataContext"

export function StateSelection() {
  const { removedStates, setRemovedStates, scales } = useData()
  const { palette, statesOrderOriginal, statesOrder, setStatesOrder, isLegend } = useViz()

  const { screenToFlowPosition, setNodes } = useReactFlow()

  const toggleRemovedState = (state) => {
    const newRemovedStates = xor(removedStates, [state])
    setRemovedStates(newRemovedStates)
  }

  // const onDragStart = (event, info, nodeType, label, color = "white") => {
  //   console.log(event)
  //   console.log(info)
  //   setType(nodeType)
  //   setLabel(label)
  //   setColor(color)
  //   // event.dataTransfer.effectAllowed = "move"
  // }

  const onDragEnd = (event, nodeType, index, color) => {
    if (isLegend) return
    // 1. Get the drop position from the event
    const { clientX, clientY } = event

    // 2. Find the React Flow container
    const flowBounds = document.querySelector(".react-flow").getBoundingClientRect()

    // 3. Check if the drop happened inside React Flow bounds
    const isInside =
      clientX >= flowBounds.left &&
      clientX <= flowBounds.right &&
      clientY >= flowBounds.top &&
      clientY <= flowBounds.bottom

    if (isInside) {
      // 4. Convert screen pixels to React Flow coordinates
      const position = screenToFlowPosition({
        x: clientX,
        y: clientY,
      })

      // 5. Add the node
      const newNode = {
        id: `node_${Date.now()}`,
        type: nodeType,
        position,
        className: "dnd-node",
        style: { backgroundColor: `${color}`, padding: 10, borderRadius: 5 },
        data: {
          label: `${index} – ${scales.indexToName(index)}`,
          index: index,
          value: 100,
          category: "Disease || Drug",
          color: color,
        },
      }

      setNodes((nds) => nds.concat(newNode))
    }
  }

  //add with button, so position is center of the view
  const addNodetoFlow = (nodeType, index, color = "white") => {
    const flowCenter = document.querySelector(".react-flow__viewport").getBoundingClientRect()

    const position = screenToFlowPosition({
      x: flowCenter.left + flowCenter.width / 2,
      y: flowCenter.top + flowCenter.height / 2,
    })

    const newNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      position,
      className: "dnd-node",
      style: { backgroundColor: `${color}`, padding: 10, borderRadius: 5 },
      data: {
        label: `${index} – ${scales.indexToName(index)}`,
        index: index,
        value: 100,
        category: "Disease || Drug",
        color: color,
      },
    }

    setNodes((nds) => nds.concat(newNode))

    setNodes((nds) =>
      resolveCollisions(nds, {
        maxIterations: Infinity,
        overlapThreshold: 0.5,
        margin: 10,
      }),
    )
  }

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
        className="list-wrapper scroll-shadows "
        animate={{
          borderBottom: removedStates.length === 0 ? "none" : "0.5px solid var(--surface-light)",
          height: divHeight < 250 ? divHeight : 250,
        }}
      >
        <Reorder.Group
          className="states-list "
          axis="y"
          onReorder={setStatesOrder}
          values={statesOrder}
        >
          {/* <AnimatePresence mode="popLayout"> */}
          {statesOrder.map((item, i) => (
            <Reorder.Item
              key={item}
              value={item}
              as="div"
              className="state-item drag"
              initial={{
                opacity: 0,
              }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 1.02 }}
              whileHover={{
                backgroundColor: "#" + tinycolor(palette[item]).toHex() + "33",
                transition: { duration: 0.1 },
              }}
              whileDrag={{ zIndex: 100 }}
              drag
              layout
              transition={transition}
              // onDragStart={(event, info) =>
              //   onDragStart(event, info, "default", item, palette[item])
              // }
              onDragEnd={(event) => onDragEnd(event, "default", item, palette[item])}
            >
              <p>
                <span>{i} –</span>
                <motion.span animate={{ color: palette[item], marginLeft: "5px" }}>
                  {scales.indexToName(item)}
                </motion.span>
              </p>
              <div className="buttons-wrapper">
                <button
                  onClick={() => {
                    addNodetoFlow("default", item, palette[item])
                  }}
                >
                  add
                </button>
                {statesOrder.length > 1 && (
                  <button
                    onClick={() => {
                      toggleRemovedState(scales.indexToName(item))
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            </Reorder.Item>
          ))}
          {/* </AnimatePresence> */}
        </Reorder.Group>
      </motion.div>

      <AnimatePresence>
        {removedStates && (
          <motion.div
            layout
            className="list-wrapper scroll-shadows "
            animate={{
              height: removedDivHeight < 150 ? removedDivHeight : 150,
              padding: removedStates.length === 0 ? "0" : "",
              border: removedStates.length > 0 ? "" : "none",
            }}
          >
            <motion.ul layout className="removed-states ">
              {removedStates.map((s, i) => (
                <motion.li key={i} layout className="state-item">
                  <p>
                    <span>{i} –</span>
                    <span style={{ marginLeft: "5px" }}>{s}</span>
                  </p>
                  <button
                    onClick={() => {
                      toggleRemovedState(s)
                    }}
                  >
                    +
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
