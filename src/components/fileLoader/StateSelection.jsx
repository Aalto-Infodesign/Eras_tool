import { useEffect, useState } from "react"
import { scaleOrdinal } from "d3"
// import { moveElementInArray } from "../../utils/moveChar"
import { xor, zip } from "lodash"

import { AnimatePresence, motion } from "motion/react"

import { Reorder } from "motion/react"

import { po } from "../../utils/po"
// import { createCompletePO } from "../../utils/POHelperFunctions"
import { resolveCollisions } from "./flowChart/resolveCollisions"
import { getDominancePairsSelfUpper } from "../../utils/POHelperFunctions"

import tinycolor from "tinycolor2"

import { useReactFlow } from "@xyflow/react"

import { jch } from "d3-cam02"

import { useViz } from "../../contexts/VizContext"

export function StateSelection({
  loadedData,
  data,

  conversionScales,
  setConversionScales,
  setWorkingData,
}) {
  const { palette, setPalette, statesOrder, setStatesOrder, setStatesOrderOriginal, isLegend } =
    useViz()

  const [removedStates, setRemovedStates] = useState([])
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
    if (!isLegend) return
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
          label: `${index} – ${conversionScales.indexToName(index)}`,
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
        label: `${index} – ${conversionScales.indexToName(index)}`,
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

  const spring = {
    type: "spring",
    damping: 20,
    stiffness: 300,
  }

  const transition = {
    duration: 0.2,
    delay: 0,
    ease: [0, 0.71, 0.2, 1.01],
  }

  useEffect(() => {
    //Only ONCE
    // Get states names from Data
    const states = data
      .map((d) => d.trajectory)
      .flat()
      .filter((e, n, l) => l.indexOf(e) === n)
      .map((state) => ({
        name: state,
      }))
    const statesNames = states.map((state) => state.name)

    // console.log("States Names", statesNames)

    // TODO FUnc che chiude con φ

    // Index them based on their order
    const stateIndexes = statesNames.map((_t, i) => `${i}`)

    // console.log("States Names Genetration")

    // Using the array and indexes to create two ordinal scales
    const scales = {
      nameToIndex: scaleOrdinal(statesNames, stateIndexes),
      indexToName: scaleOrdinal(stateIndexes, statesNames),
    }

    setConversionScales(scales)

    // Sorting the indexes but this is USELESS
    const stateNamesSorted = stateIndexes.toSorted()
    // console.log("States Indexes Sorted", stateNamesSorted)
    // setStateNamesOrder(stateNamesSorted)

    setStatesOrder(stateIndexes)
    setStatesOrderOriginal(stateIndexes)

    const statesPO = getDominancePairsSelfUpper(statesNames)
    console.log("States Interdipendncy Groups", statesPO)

    const labels = statesPO.flat().filter((e, n, l) => l.indexOf(e) === n)

    console.log("l", labels)
    const { matrix, nodes } = po.domFromEdges(statesPO)
    console.table("m", matrix)

    const posetInterdipendency = po.createPoset(matrix, nodes)

    posetInterdipendency
      .enrich()
      .feature("aFeature", 0)
      .feature("upset", (node) => posetInterdipendency.getUpset(node))
      .feature("above", (node) => posetInterdipendency.getCovering(node))
      .feature("below", (node) => posetInterdipendency.getCovered(node))
      .feature("downset", (node) => posetInterdipendency.getDownset(node))
      .feature("upsetLength", (node, row) => row.upset.length)
      .eachFeature("below", (nodeName, featureValue) => console.log(nodeName, featureValue))
      .setLayers()
      .color(0, 40, 80, false)
      .feature("jchFill", (_node, d) => {
        console.log(d)
        const JCH = jch(d.pTheta, d.pAlpha * 100, d.pL)
        return `hsl(${JCH.J},${JCH.C}%,${JCH.h}%)`
      })
      .print()

    const posetFeatures = posetInterdipendency.features
    const posetPalette = statesNames.map((s) => posetFeatures[scales.indexToName(s)].jchFill)

    const palette = Object.fromEntries(zip(stateNamesSorted, posetPalette))
    console.log("palette", palette)
    setPalette(palette)
  }, [data, removedStates])

  useEffect(() => {
    const handleRemoveStates = (statesToRemove) => {
      // TODO: data should be the original data, stored in loadedData

      const newData = loadedData.map((d) => {
        // Find all indexes to remove
        const indexesToRemove = d.trajectory
          .map((state, idx) => (statesToRemove.includes(state) ? idx : -1))
          .filter((idx) => idx !== -1)
        if (indexesToRemove.length > 0) {
          const newTrajectory = d.trajectory.filter((_, idx) => !indexesToRemove.includes(idx))
          const newSWA = d.SwitchEventAge.filter((_, idx) => !indexesToRemove.includes(idx))
          const newYears = d.years.filter((_, idx) => !indexesToRemove.includes(idx))
          return { ...d, trajectory: newTrajectory, SwitchEventAge: newSWA, years: newYears }
        } else {
          return d
        }
      })

      console.log("New Data", newData)
      setWorkingData(newData)
    }

    handleRemoveStates(removedStates)
  }, [removedStates])

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
                  {conversionScales.indexToName(item)}
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
                      toggleRemovedState(conversionScales.indexToName(item))
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
