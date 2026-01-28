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
  const { richData, scales } = useData()

  const [statesOrder, setStatesOrder] = useState([])

  // UI STATE
  const [isLegend, setIsLegend] = useState(false)

  const { palette, statesOrderOriginal } = useMemo(() => {
    if (!richData?.length || !scales) return { palette: {}, statesOrderOriginal: [] }
    console.time("Palette Poset")
    const states = richData
      .map((d) => d.trajectory)
      .flat()
      .filter((e, n, l) => l.indexOf(e) === n)
      .map((state) => ({
        name: state,
      }))
    const statesNames = states.map((state) => state.name)

    const statesOrderOriginal = statesNames.map((_t, i) => `${i}`)
    const stateNamesSorted = statesOrderOriginal.toSorted()
    const statesPO = getDominancePairsSelfUpper(statesNames)
    // console.log("States Interdipendncy Groups", statesPO)

    const labels = statesPO.flat().filter((e, n, l) => l.indexOf(e) === n)

    // console.log("l", labels)
    const { matrix, nodes } = po.domFromEdges(statesPO)
    // console.table("m", matrix)

    const posetInterdipendency = po.createPoset(matrix, nodes)

    posetInterdipendency
      .enrich()
      .feature("aFeature", 0)
      .feature("upset", (node) => posetInterdipendency.getUpset(node))
      .feature("above", (node) => posetInterdipendency.getCovering(node))
      .feature("below", (node) => posetInterdipendency.getCovered(node))
      .feature("downset", (node) => posetInterdipendency.getDownset(node))
      .feature("upsetLength", (node, row) => row.upset.length)
      // .eachFeature("below", (nodeName, featureValue) => console.log(nodeName, featureValue))
      .setLayers()
      .color(0, 40, 80, false)
      .feature("jchFill", (_node, d) => {
        // console.log(d)
        const JCH = jch(d.pTheta, d.pAlpha * 100, d.pL)
        return `hsl(${JCH.J},${JCH.C}%,${JCH.h}%)`
      })
    // .print()

    const posetFeatures = posetInterdipendency.features

    // console.log(posetFeatures)
    const posetPalette = statesNames.map((s) => posetFeatures[s].jchFill)

    const palette = Object.fromEntries(zip(stateNamesSorted, posetPalette))

    console.timeEnd("Palette Poset")
    return { palette, statesOrderOriginal }
  }, [richData, scales])

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
