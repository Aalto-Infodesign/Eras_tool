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
  const { scales, statesData, idealSilhouettes } = useData()
  const [statesOrder, setStatesOrder] = useState([])
  const [dominanceArrayFromFlow, setDominanceArrayFromFlow] = useState(null)
  const [nodesFromFlow, setNodesFromFlow] = useState(null)

  // UI STATE
  const [colorMode, setColorMode] = useState("standard") // standard || poset
  const [theme, setTheme] = useState("dark")
  const [isLegend, setIsLegend] = useState(false)
  const [loadingCount, setLoadingCount] = useState(0)
  const [hasFlowChart, setHasFlowChart] = useState(true)
  const [chartType, setChartType] = useState(1)
  const [isHasse, setIsHasse] = useState(false) // false: typologies, true: hasse

  useModifierKey("1", () => setChartType(1))
  useModifierKey("2", () => setChartType(2))

  useModifierKey("t", () => setColorMode("poset"))
  useModifierKey("s", () => setColorMode("standard"))

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

    const statesOrderOriginal = dominanceNodes.map((_t, i) => `${i}`)
    const stateNamesSorted = statesOrderOriginal.toSorted()

    const { matrix, nodes } = po.domFromEdges(dominanceArray)

    const getColorSpace = (min, max, midPoint, step, length) => {
      console.log(length)

      if (length < 2) return { min: min, max: max }

      const minV = midPoint - step * length
      const maxV = midPoint + step * length
      const Cmin = minV > min ? minV : min
      const Cmax = maxV < max ? maxV : max

      return { min: Cmin, max: Cmax }
    }

    // console.log("POSET Matrix:", matrix)
    // console.log("POSET Nodes:", nodes)
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

    const { min, max } = getColorSpace(40, 90, 65, 5, maxChainLength)

    console.log(min)
    console.log(max)

    poset.color(20, min, max, false) // Based on Layer length

    // .feature("jchFill", (_node, d) => {
    //   const JCH = jch(d.pTheta, d.pAlpha * 100, d.pL)
    //   return `hsl(${JCH.J},${JCH.C}%,${JCH.h}%)`
    // })

    const posetFeatures = poset.features

    // console.log("POSET Features:", posetFeatures)
    // console.log("SNames:", dominanceNodes)

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
      statesOrder,
      statesOrderOriginal,
      isLegend,
      hasFlowChart,
      loadingCount,
      updatePosetColoring,
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
