import { createContext, useState, useContext, useMemo, useCallback, useEffect } from "react"
import { useData } from "./ProcessedDataContext"

const FiltersContext = createContext(null)

export function FiltersProvider({ children }) {
  const { filtersBlueprint } = useData()
  const [filters, setFilters] = useState(filtersBlueprint)
  const [isDragging, setIsDragging] = useState(false)

  // Sync internal state when the source data changes
  useEffect(() => {
    if (filtersBlueprint) {
      setFilters(filtersBlueprint)
    }
  }, [filtersBlueprint])

  const updateSelection = useCallback((key, newSelection) => {
    console.log("Update filters", key)
    setFilters((prev) => {
      // Guard clause to prevent errors if filters haven't loaded yet
      if (!prev || !prev[key]) return prev
      return {
        ...prev,
        [key]: { ...prev[key], selection: newSelection },
      }
    })
  }, [])

  const value = useMemo(
    () => ({ filters, updateSelection, isDragging, setIsDragging }),
    [filters, updateSelection, isDragging, setIsDragging],
  )

  // Prevent rendering consumers until we actually have filter data
  if (!filters) return null

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

// Custom hook to use the data context
export function useFilters() {
  const context = useContext(FiltersContext)
  if (!context) {
    throw new Error("useData must be used within a VizProvider")
  }
  return context
}
