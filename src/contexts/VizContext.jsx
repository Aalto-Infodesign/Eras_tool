import { createContext, useState, useContext, useMemo, useEffect } from "react"
import { useRawData } from "./RawDataContext"
import { useData } from "./ProcessedDataContext"
import { zip } from "lodash"

import { po } from "../utils/po"
import { getDominancePairsSelfUpper } from "../utils/POHelperFunctions"

import { jch } from "d3-cam02"

const VizContext = createContext(null)

export function VizProvider({ children }) {
  const { fileName } = useRawData()
  const { scales, statesData } = useData()
  const [statesOrder, setStatesOrder] = useState([])
  const [dominanceArrayFromFlow, setDominanceArrayFromFlow] = useState(null)
  const [nodesFromFlow, setNodesFromFlow] = useState(null)

  // UI STATE
  const [isLegend, setIsLegend] = useState(false)

  // Function to generate palette from dominance array
  const generatePaletteFromDominance = (dominanceArray, dominanceNodes) => {
    if (!dominanceArray) return null

    const statesOrderOriginal = dominanceNodes.map((_t, i) => `${i}`)
    const stateNamesSorted = statesOrderOriginal.toSorted()

    console.log("dominance Array", dominanceArray)

    const { matrix, nodes } = po.domFromEdges(dominanceArray)

    console.log("POSET Matrix:", matrix)
    console.log("POSET Nodes:", nodes)
    const posetInterdipendency = po.createPoset(matrix, nodes)

    posetInterdipendency
      .enrich()
      .feature("aFeature", 0)
      .feature("upset", (node) => posetInterdipendency.getUpset(node))
      .feature("above", (node) => posetInterdipendency.getCovering(node))
      .feature("below", (node) => posetInterdipendency.getCovered(node))
      .feature("downset", (node) => posetInterdipendency.getDownset(node))
      .feature("upsetLength", (node, row) => row.upset.length)
      // SET Analytic che e una scala mappando
      .setLayers()
      .color(0, 40, 80, false) // Based on Layer length
    // .feature("jchFill", (_node, d) => {
    //   const JCH = jch(d.pTheta, d.pAlpha * 100, d.pL)
    //   return `hsl(${JCH.J},${JCH.C}%,${JCH.h}%)`
    // })

    const posetFeatures = posetInterdipendency.features

    console.log("POSET Features:", posetFeatures)
    console.log("SNames:", dominanceNodes)

    const posetPalette = dominanceNodes.map((s) => posetFeatures[s].fill)
    const palette = Object.fromEntries(zip(stateNamesSorted, posetPalette))

    return palette
  }

  // Calculate palette (combines data-derived and flowchart-derived dominance)
  const { palette, statesOrderOriginal } = useMemo(() => {
    if (!statesData || !scales) return { palette: {}, statesOrderOriginal: [] }

    // console.log(statesData.statesNames)
    const statesNames = statesData.statesNames
    const statesOrderOriginal = statesNames.map((_t, i) => `${i}`)

    // Priority: Use flowchart dominance if available, otherwise use default
    const dominanceArray = dominanceArrayFromFlow || getDominancePairsSelfUpper(statesNames)
    const nodes = nodesFromFlow || statesNames

    const palette = generatePaletteFromDominance(dominanceArray, nodes)

    // console.timeEnd("Palette Poset")

    return { palette, statesOrderOriginal }
  }, [statesData, scales, dominanceArrayFromFlow])

  // Function that your FlowChart component can call
  const updatePosetColoring = (dominanceArray, nodes) => {
    // TODO Check if PO (only unique states)
    if (dominanceArray && nodes) {
      console.log("Updating to flowchart-based POSET coloring")
      setDominanceArrayFromFlow(dominanceArray)
      setNodesFromFlow(nodes)
    } else {
      console.log("Reverting to unconnected state coloring")
      setDominanceArrayFromFlow(null)
      setNodesFromFlow(null)
    }
  }

  useEffect(() => {
    setStatesOrder(statesOrderOriginal)
  }, [fileName, statesOrderOriginal])

  const value = useMemo(
    () => ({
      palette,
      statesOrder,
      statesOrderOriginal,
      isLegend,
      setStatesOrder,
      setIsLegend,
      updatePosetColoring, // Expose this to child components
    }),
    [palette, statesOrder, statesOrderOriginal, isLegend],
  )

  return <VizContext.Provider value={value}>{children}</VizContext.Provider>
}
// Custom hook to use the data context
export function useViz() {
  const context = useContext(VizContext)
  if (!context) {
    throw new Error("useData must be used within a VizProvider")
  }
  return context
}
