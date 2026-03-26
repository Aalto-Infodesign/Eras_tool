/**
 * Context to process all the Data that are originally created in Processed Data Context
 * and depend on Filters
 */

import { createContext, useContext, useMemo } from "react"
import { useData } from "./ProcessedDataContext"
import { useFilters } from "./FiltersContext"
import { isEmpty, includes, union, flattenDeep } from "lodash"
import { min, max } from "d3"

import {
  useTrajectoriesFromData,
  useSilhouettesFromTrajectories,
  useAnalytics,
  useFiltersSetup,
} from "../components/hooks/useDataProcessing"
import { useViz } from "./VizContext"

const DerivedContext = createContext(null)

export function DerivedDataProvider({ children }) {
  const { richData, idealSilhouettes } = useData()
  const {
    filtersSelection,
    filtersActive,
    filtersInverted,
    selectedSilhouettesNames,
    selectedTrajectoriesIDs,
    trajectoriesSelectionMode,
    removedStates,
  } = useFilters()
  const { chartType } = useViz()

  // console.log("Silhouettes", silhouettes)

  const isReady = richData?.length > 0 && !isEmpty(filtersSelection)

  const data = useMemo(() => {
    if (!richData) return []
    if (removedStates.length === 0) return richData
    return richData
      .map((d) => {
        // Find all indexes to remove
        const indexesToRemove = d.trajectory
          .map((state, idx) => (removedStates.includes(state) ? idx : -1))
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
      .filter((d) => d.trajectory.length > 0)
  }, [richData, removedStates])

  const trajectories = useTrajectoriesFromData(data)
  const silhouettes = useSilhouettesFromTrajectories(trajectories, idealSilhouettes, data)
  const analytics = useAnalytics(data)

  const filters = useFiltersSetup(data, trajectories, filtersSelection, filtersInverted)

  const applyFilter = (isNull, passes, isInverted) => {
    if (isNull) return true
    return isInverted ? !passes : passes
  }

  const filteredData = useMemo(() => {
    if (!isReady) return []

    if (!filtersActive) return data

    const filteredData = data
      .filter((datum) =>
        applyFilter(
          datum.diseaseDuration === null,
          datum.diseaseDuration >= filters.diseaseDuration.selection[0] &&
            datum.diseaseDuration <= filters.diseaseDuration.selection[1],
          filters.diseaseDuration.isInverted,
        ),
      )
      .filter((datum) =>
        applyFilter(
          datum.years === null,
          datum.years.length === 0 ||
            (Math.floor(min(datum.years)) >= filters.date.selection[0] &&
              Math.floor(max(datum.years)) <= filters.date.selection[1]),
          filters.date.isInverted,
        ),
      )

    return filteredData
  }, [data, filters, filtersActive])

  // console.log("fd", filteredData)

  const filteredTrajectories = useTrajectoriesFromData(filteredData)

  const filteredLinks = useMemo(() => {
    return filteredTrajectories.flat()
  }, [filteredTrajectories])

  const filteredSilhouettes = useSilhouettesFromTrajectories(
    filteredTrajectories,
    idealSilhouettes,
    data,
  )

  // Step 2: derive silhouettes from filtered data
  const completeSilhouettes = useMemo(() => {
    if (!filtersActive || filteredSilhouettes.length === 0)
      return silhouettes.map((s) => ({
        ...s,
        filtered: null,
        isFiltered: false,
      }))

    const map = new Map(filteredSilhouettes.map((s) => [s.name, s]))
    return silhouettes.map((s) => {
      const filteredVersion = map.get(s.name) ?? null
      return { ...s, filtered: filteredVersion, isFiltered: filteredVersion !== null }
    })
  }, [silhouettes, filteredSilhouettes, filtersActive])

  const selectedSilhouettesData = useMemo(() => {
    if (selectedSilhouettesNames && selectedSilhouettesNames.length === 0) return []
    return completeSilhouettes.filter((s) => includes(selectedSilhouettesNames, s.name))
  }, [completeSilhouettes, selectedSilhouettesNames])

  const linksBySelectedSilhouettes = useMemo(() => {
    console.time("Selected Links")
    const s = selectedSilhouettesData.length === 0 ? silhouettes : selectedSilhouettesData
    const individuals = new Set(flattenDeep(s.map((s) => s.trajectories)).map((t) => t.id))

    console.timeEnd("Selected Links")
    return filteredLinks.filter((l) => {
      // Ricerca O(1) invece di O(n)
      if (!individuals.has(l.id)) return false
      // if (hasLumpFilter && !selectedLumpsTypes.has(l.lump)) return false

      return true
    })
  }, [silhouettes, selectedSilhouettesData, filteredLinks])

  const IDsFromSelectedSilhouettes = useMemo(() => {
    if (!selectedSilhouettesData?.length) return []
    const ids = []
    for (const s of selectedSilhouettesData) {
      const source = s.isFiltered ? s.filtered.trajectories : s.trajectories
      for (const t of source) {
        const id = t[0]?.id
        if (id != null) ids.push(id)
      }
    }
    return ids
  }, [selectedSilhouettesData])

  const selectedLinks = useMemo(() => {
    const links = linksBySelectedSilhouettes.filter((datum) =>
      applyFilter(
        datum.speed === null,
        Math.floor(datum.speed) >= filters.speed.selection[0] &&
          Math.floor(datum.speed) <= filters.speed.selection[1],
        filters.speed.isInverted,
      ),
    )

    if (trajectoriesSelectionMode === "all") return links
    if (trajectoriesSelectionMode === "vertical") return links.filter((l) => l.speed === 0)
    else return links.filter((l) => l.speed !== 0)
  }, [linksBySelectedSilhouettes, trajectoriesSelectionMode, filters, filtersActive])

  const selectedIDs = useMemo(() => {
    if (!IDsFromSelectedSilhouettes) return []

    const IDsFromTrajectories = selectedTrajectoriesIDs || []
    const type = Number(chartType)

    if (type === 1 && IDsFromTrajectories.length > 0) {
      /** * EXCLUSIVE (AND / INTERSECTION)
       * Returns only IDs that appear in BOTH categories.
       */
      return [...IDsFromTrajectories]
    }

    if (type === 2) {
      /** * INCLUSIVE (OR / UNION)
       * Returns everything selected in BOTH silhouettes and trajectories.
       */
      return union(IDsFromSelectedSilhouettes, IDsFromTrajectories)
    }

    // Default fallback (e.g., just Silhouettes)
    return [...IDsFromSelectedSilhouettes]
  }, [IDsFromSelectedSilhouettes, selectedTrajectoriesIDs, chartType])

  const value = useMemo(
    () => ({
      data,
      trajectories,
      silhouettes,
      filteredData,
      filteredLinks,
      filteredSilhouettes,
      completeSilhouettes,
      selectedSilhouettesData,
      selectedIDs,
      selectedLinks,
      IDsFromSelectedSilhouettes,
      analytics,
      filters,
    }),
    [
      data,
      trajectories,
      silhouettes,
      filteredData,
      filteredLinks,
      filteredSilhouettes,
      completeSilhouettes,
      selectedSilhouettesData,
      selectedIDs,
      selectedLinks,
      IDsFromSelectedSilhouettes,
      analytics,
      filters,
    ],
  )

  return <DerivedContext.Provider value={value}>{children}</DerivedContext.Provider>
}

// Custom hook to use the data context
export function useDerivedData() {
  const context = useContext(DerivedContext)
  if (!context) {
    throw new Error("useDerivedData must be used within a DerivedDataProvider")
  }
  return context
}
