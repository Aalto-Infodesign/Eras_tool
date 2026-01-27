import { createContext, useState, useContext } from "react"

const VizContext = createContext(null)

export function VizProvider({ children }) {
  // VIZ
  const [palette, setPalette] = useState([])
  const [scales, setScales] = useState({})
  const [filters, setFilters] = useState([])
  const [statesOrder, setStatesOrder] = useState([])
  const [statesOrderOriginal, setStatesOrderOriginal] = useState([])

  // LOCAL STATE
  const [isLegend, setIsLegend] = useState(false)

  const newVizParameters = (scales, filters) => {
    setScales(scales)
    setFilters(filters)
  }

  const value = {
    // State
    palette,
    scales,
    filters,
    statesOrder,
    statesOrderOriginal,
    isLegend,
    // Setters
    setPalette,
    setScales,
    setFilters,
    setStatesOrder,
    setStatesOrderOriginal,
    setIsLegend,
    //Helper
    newVizParameters,
  }

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
