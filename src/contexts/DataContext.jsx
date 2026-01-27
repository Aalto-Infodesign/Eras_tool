import { createContext, useState, useContext } from "react"

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [data, setData] = useState([])
  const [statesData, setStatesData] = useState({})
  const [analytics, setAnalytics] = useState({})
  const [silhouettes, setSilhouettes] = useState([])
  const [idealSilhouettes, setIdealSilhouettes] = useState([])

  // Helper function to update all data at once
  const newDataset = (data, statesData, analytics, silhouettes) => {
    setData(data)
    setStatesData(statesData)
    setAnalytics(analytics)
    setSilhouettes(silhouettes)
  }

  const value = {
    // State
    data,
    statesData,
    analytics,
    silhouettes,
    idealSilhouettes,
    // Setters
    setData,
    setStatesData,
    setAnalytics,
    setSilhouettes,
    setIdealSilhouettes,
    // Helpers
    newDataset,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// Custom hook to use the data context
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
