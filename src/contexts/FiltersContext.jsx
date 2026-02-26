import { createContext, useState, useContext, useMemo, useCallback, useEffect } from "react"
import { useData } from "./ProcessedDataContext"
import { isEqual } from "lodash"

const FiltersContext = createContext(null)

// TODO Add toggles

export function FiltersProvider({ children }) {
  const { filtersBlueprint, idealSilhouettes } = useData()
  // Sliders
  const [filters, setFilters] = useState(filtersBlueprint)
  const [isDragging, setIsDragging] = useState(false)

  // Selection Data
  const [selectedSilhouettesNames, setSelectedSilhouettesNames] = useState(idealSilhouettes) // Main filter
  const [selectedTrajectoriesIDs, setSelectedTrajectoriesIDs] = useState([])

  // Sync internal state when the source data changes
  useEffect(() => {
    if (filtersBlueprint) {
      setFilters(filtersBlueprint)
    }
  }, [filtersBlueprint])

  const resetFilter = (key) => {
    setFilters((prev) => {
      // Guard clause to prevent errors if filters haven't loaded yet
      if (!prev || !prev[key]) return prev
      return {
        ...prev,
        [key]: { ...prev[key], selection: prev[key].extent, isActive: false },
      }
    })
  }

  const updateSelection = useCallback((key, newSelection) => {
    console.log("Update filters", key)
    setFilters((prev) => {
      // Guard clause to prevent errors if filters haven't loaded yet
      if (!prev || !prev[key]) return prev
      const isActive = !isEqual(prev[key].selection, prev[key].extent)
      return {
        ...prev,
        [key]: { ...prev[key], selection: newSelection, isActive: isActive },
      }
    })
  }, [])

  const toggleSilhouetteFilter = (silhouette) => {
    const silhouettesToToggle = Array.isArray(silhouette) ? silhouette : [silhouette]

    setSelectedSilhouettesNames((prev) => {
      if (silhouettesToToggle.length === 1) {
        const item = silhouettesToToggle[0]
        return prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
      } else {
        const allAreSelected = silhouettesToToggle.every((s) => prev.includes(s))
        return allAreSelected
          ? prev.filter((s) => !silhouettesToToggle.includes(s))
          : [...new Set([...prev, ...silhouettesToToggle])]
      }
    })
  }

  const value = useMemo(
    () => ({
      updateSelection,
      resetFilter,
      // Sliders
      filters,
      isDragging,
      setIsDragging,
      // Selection
      selectedSilhouettesNames,
      setSelectedSilhouettesNames,
      toggleSilhouetteFilter,
      selectedTrajectoriesIDs,
      setSelectedTrajectoriesIDs,
    }),
    [
      updateSelection,
      resetFilter,
      filters,
      isDragging,
      setIsDragging,
      selectedSilhouettesNames,
      setSelectedSilhouettesNames,
      toggleSilhouetteFilter,
      selectedTrajectoriesIDs,
      setSelectedTrajectoriesIDs,
    ],
  )

  // Prevent rendering consumers until we actually have filter data
  if (!filters) return null

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

// Custom hook to use the data context
export function useFilters() {
  const context = useContext(FiltersContext)
  if (!context) {
    throw new Error("useFilters must be used within a FiltersProvider")
  }
  return context
}
