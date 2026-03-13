import { createContext, useState, useContext, useMemo, useEffect, useCallback } from "react"
import { useRawData } from "./RawDataContext"
import { useData } from "./ProcessedDataContext"
import { zip } from "lodash"
import { max } from "d3"

import { po } from "../utils/po"
import { getDominancePairsSelfUpper } from "../utils/POHelperFunctions"
import { useModifierKey } from "../components/hooks/useModifierKey"

const VizContext = createContext(null)

export function VizProvider({ children }) {
  const { fileName } = useRawData()
  const { statesData, idealSilhouettes, removedStates } = useData()

  const [dominanceArrayFromFlow, setDominanceArrayFromFlow] = useState(null)
  const [nodesFromFlow, setNodesFromFlow] = useState(null)

  // UI STATE
  const [colorMode, setColorMode] = useState("standard") // standard || poset
  // const [theme, setTheme] = useState("dark")
  const [isLegend, setIsLegend] = useState(false)
  const [loadingCount, setLoadingCount] = useState(0)
  const [hasFlowChart, setHasFlowChart] = useState(true)
  const [chartType, setChartType] = useState(1)
  const [isHasse, setIsHasse] = useState(false) // false: typologies, true: hasse

  useModifierKey("1", () => setChartType(1))
  useModifierKey("2", () => setChartType(2))

  // useModifierKey("p", () => setColorMode("poset"))
  useModifierKey("s", () =>
    setColorMode(
      (prev) => idealSilhouettes.length !== 0 && (prev === "standard" ? "poset" : "standard"),
    ),
  )

  useModifierKey("t", () => setIsHasse(false))
  useModifierKey("h", () => setIsHasse(true))

  const startLoading = useCallback(() => setLoadingCount((c) => c + 1), [])
  const stopLoading = useCallback(() => setLoadingCount((c) => Math.max(0, c - 1)), [])

  useEffect(() => {
    if (fileName) {
      setIsLegend(false)
    }
  }, [fileName])

  const maxChainLength = useMemo(() => {
    if (!idealSilhouettes.length) return 0
    return max(idealSilhouettes.map((s) => s.split("-").length))
  }, [idealSilhouettes])

  // Function to generate palette from dominance array
  const generatePaletteFromDominance = (dominanceArray, dominanceNodes) => {
    if (!dominanceArray) return null

    const stateNamesSorted = dominanceNodes
    // const stateNamesSorted = dominanceNodes.map((_t, i) => `${i}`).toSorted()

    const { matrix, nodes } = po.domFromEdges(dominanceArray)

    const getColorSpace = (min, max, midPoint, step, length) => {
      if (colorMode !== "poset") return { min: 40, max: 90 }

      if (length === 0) return { min: min, max: max }

      const STEP = (max - min) / length

      const minV = midPoint - STEP
      const maxV = midPoint + STEP

      if (minV > min || maxV < max) return { min: minV, max: maxV }

      return { min: midPoint - 10 * length, max: midPoint - 10 * length }
    }

    const poset = po.createPoset(matrix, nodes)

    poset
      .enrich()
      .feature("aFeature", 0)
      .feature("upset", (node) => poset.getUpset(node))
      .feature("above", (node) => poset.getCovering(node))
      .feature("below", (node) => poset.getCovered(node))
      .feature("downset", (node) => poset.getDownset(node))
      .feature("upsetLength", (node, row) => row.upset.length)
      // SET Analytic che e una scala mappando
      .setLayers()

    const { min, max } = getColorSpace(20, 90, 65, 10, maxChainLength)

    poset.color(20, min, max, false) // Based on Layer length

    const posetFeatures = poset.features

    const posetPalette = dominanceNodes.map((s) => posetFeatures[s].fill)
    const palette = Object.fromEntries(zip(stateNamesSorted, posetPalette))

    return palette
  }

  // Calculate palette (combines data-derived and flowchart-derived dominance)
  const { palette } = useMemo(() => {
    if (!statesData.statesNames) return { palette: {} }

    const statesNames = statesData.statesNames

    // Priority: Use flowchart dominance if available, otherwise use default
    const dominanceFromStates = getDominancePairsSelfUpper(statesNames)

    const dominanceArray = dominanceArrayFromFlow || dominanceFromStates
    console.log("dominanceArray", dominanceArray)
    const nodes = nodesFromFlow || statesNames

    const palette =
      colorMode === "poset"
        ? generatePaletteFromDominance(dominanceArray, nodes)
        : generatePaletteFromDominance(dominanceFromStates, statesNames)

    return { palette }
  }, [
    idealSilhouettes,
    statesData,
    removedStates,
    dominanceArrayFromFlow,
    colorMode,
    generatePaletteFromDominance,
    nodesFromFlow,
  ])

  // Function that your FlowChart component can call
  const updatePosetColoring = (dominanceArray, nodes) => {
    // TODO Check if PO (only unique states)
    if (dominanceArray && nodes && colorMode === "poset") {
      console.log("Updating to flowchart-based POSET coloring")
      setDominanceArrayFromFlow(dominanceArray)
      setNodesFromFlow(nodes)
    } else {
      console.log("Reverting to unconnected state coloring")
      setDominanceArrayFromFlow(null)
      setNodesFromFlow(null)
    }
  }

  const value = useMemo(
    () => ({
      palette,

      isLegend,
      setIsLegend,
      updatePosetColoring, // Expose this to child components
      hasFlowChart,
      setHasFlowChart,
      startLoading,
      stopLoading,
      //UI
      isLoading: loadingCount > 0,
      chartType,
      setChartType,
      isHasse,
      setIsHasse,
      colorMode,
      setColorMode,
    }),
    [
      palette,
      isLegend,
      hasFlowChart,
      loadingCount,
      updatePosetColoring,
      isHasse,
      startLoading,
      stopLoading,
      chartType,
      setChartType,
      colorMode,
      setColorMode,
    ],
  )

  return <VizContext.Provider value={value}>{children}</VizContext.Provider>
}
// Custom hook to use the data context
export function useViz() {
  const context = useContext(VizContext)
  if (!context) {
    throw new Error("useViz must be used within a VizProvider")
  }
  return context
}
