import { createContext, useState, useContext, useMemo, useCallback, useEffect } from "react"
import { useData } from "./ProcessedDataContext"
import { isEqual, isEmpty } from "lodash"
import { useRawData } from "./RawDataContext"
import { xor, difference } from "lodash"
import { useViz } from "./VizContext"
import { useDebouncedState } from "hamo"

const FiltersContext = createContext(null)

// TODO Add toggles

export function FiltersProvider({ children }) {
  //TODO URL API CALL

  const { fileName } = useRawData()
  const { existingIdealSilhouettes, statesData, setStatesOrder } = useData()
  const { chartType } = useViz()

  //States
  const [removedStates, setRemovedStates] = useState([]) // Edited in States Selection

  // Sliders
  const [filtersSelection, setFiltersSelection] = useDebouncedState(
    {
      date: null,
      diseaseDuration: null,
      age: null,
      speed: null,
    },
    80,
  )
  const [filtersInverted, setFiltersInverted] = useState({
    date: false,
    diseaseDuration: false,
    age: false,
    speed: false,
  })
  const [isDragging, setIsDragging] = useState(false)

  // Selection Data
  const [selectedSilhouettesNames, setSelectedSilhouettesNames] = useState([]) // Main filter
  const [selectedTrajectoriesIDs, setSelectedTrajectoriesIDs] = useState([])

  const [trajectoriesSelectionMode, setTrajectoriesSelectionMode] = useState("all") // all, diagonal, parallel

  //Reset when fileName changes
  useEffect(() => {
    setSelectedSilhouettesNames([])
    setSelectedTrajectoriesIDs([])
    setTrajectoriesSelectionMode("all")
    setRemovedStates([])
    setFiltersSelection({
      date: null,
      diseaseDuration: null,
      age: null,
      speed: null,
    })
    setFiltersInverted({ date: false, diseaseDuration: false, age: false, speed: false })
  }, [fileName])

  useEffect(() => {
    setTrajectoriesSelectionMode("all")
  }, [chartType])

  useEffect(() => {
    if (!statesData.statesNames) return
    setStatesOrder(difference(statesData.statesNames, removedStates))
  }, [statesData.statesNames, removedStates])

  useEffect(() => {
    if (existingIdealSilhouettes) {
      const names = existingIdealSilhouettes.map((s) => s.name)
      setSelectedSilhouettesNames(names)
    }
  }, [existingIdealSilhouettes])

  const resetFilter = (key) => {
    setFiltersSelection((prev) => {
      if (!prev || !prev[key]) return prev
      return {
        ...prev,
        [key]: null,
      }
    })
    setFiltersInverted({ date: false, diseaseDuration: false, age: false, speed: false })
  }

  // TODO Invert Filters
  const toggleInvertFilter = useCallback((key) => {
    setFiltersInverted((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const updateSelection = useCallback((key, newSelection) => {
    setFiltersSelection((prev) => ({
      ...prev,
      [key]: newSelection, // Just set it. The DerivedData will handle the merging.
    }))
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

  const toggleSelectedTrajectory = (trajectoryID) => {
    setSelectedTrajectoriesIDs((prev) => {
      const ids = Array.isArray(trajectoryID) ? trajectoryID : [trajectoryID]
      return xor(prev, ids)
    })
  }
  const filtersActive = useMemo(() => {
    if (isEmpty(filtersSelection)) return false
    return filtersSelection.date || filtersSelection.diseaseDuration || filtersSelection.speed
  }, [filtersSelection])

  const toggleRemovedState = useCallback((state) => {
    setRemovedStates((prev) => xor(prev, [state]))
  }, [])

  const value = useMemo(
    () => ({
      filtersSelection,
      updateSelection,
      resetFilter,
      setFiltersSelection,
      toggleInvertFilter,
      filtersInverted,

      // States
      removedStates,
      toggleRemovedState,
      setRemovedStates,
      // Sliders

      isDragging,
      setIsDragging,
      // Selection
      selectedSilhouettesNames,
      setSelectedSilhouettesNames,
      toggleSilhouetteFilter,
      selectedTrajectoriesIDs,
      setSelectedTrajectoriesIDs,
      toggleSelectedTrajectory,
      trajectoriesSelectionMode,
      setTrajectoriesSelectionMode,
      //Flag
      filtersActive,
    }),
    [
      filtersSelection,
      updateSelection,
      resetFilter,
      isDragging,
      setIsDragging,
      selectedSilhouettesNames,
      setSelectedSilhouettesNames,
      toggleSilhouetteFilter,
      selectedTrajectoriesIDs,
      setSelectedTrajectoriesIDs,
      toggleSelectedTrajectory,
      trajectoriesSelectionMode,
      setTrajectoriesSelectionMode,
      //Flag
      filtersActive,
      filtersInverted,
    ],
  )

  // Prevent rendering consumers until we actually have filter data
  if (!filtersSelection) return null

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
