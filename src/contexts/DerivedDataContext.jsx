/**
 * Context to process all the Data that are originally created in Processed Data Context
 * and depend on Filters
 */

import { createContext, useContext, useMemo } from "react"
import { useData } from "./ProcessedDataContext"
import { useFilters } from "./FiltersContext"
import { isEmpty, includes, union } from "lodash"
import { min, max } from "d3"

import {
  trajectoriesFromData,
  silhouettesFromTrajectories,
} from "../components/hooks/useDataProcessing"
import { useViz } from "./VizContext"

const DerivedContext = createContext(null)

export function DerivedDataProvider({ children }) {
  const { silhouettes, richData, idealSilhouettes } = useData()
  const { filters, selectedSilhouettesNames, selectedTrajectoriesIDs } = useFilters()
  const { chartType } = useViz()

  const isReady = silhouettes?.length > 0 && richData?.length > 0 && !isEmpty(filters)

  console.time("Derived Data")
  const filteredData = useMemo(() => {
    if (!isReady) return []

    return richData
      .filter(
        (datum) =>
          datum.diseaseDuration === null ||
          (datum.diseaseDuration >= filters.diseaseDuration.selection[0] &&
            datum.diseaseDuration <= filters.diseaseDuration.selection[1]),
      )
      .filter(
        (datum) =>
          datum.years === null ||
          datum.years.length === 0 ||
          (Math.floor(min(datum.years)) >= filters.date.selection[0] &&
            Math.floor(max(datum.years)) <= filters.date.selection[1]),
      )
  }, [richData, filters])

  console.log("fd", filteredData)

  const filteredTrajectories = useMemo(() => {
    if (filteredData.length === 0) return []
    return trajectoriesFromData(filteredData)
  }, [filteredData])

  const completeLinks = useMemo(() => {
    return filteredTrajectories.flat().map((s) => ({
      ...s,
      lump: s.source.state + "-" + s.target.state,
    }))
  }, [filteredTrajectories])

  const filteredSilhouettes = useMemo(() => {
    if (filteredTrajectories.length === 0) return []
    return silhouettesFromTrajectories(filteredTrajectories, idealSilhouettes, richData)
  }, [filteredTrajectories, idealSilhouettes, richData])

  // Step 2: derive silhouettes from filtered data
  const silhouettesMap = useMemo(() => {
    if (filteredSilhouettes.length === 0) return new Map()

    const map = new Map()
    filteredSilhouettes.forEach((s) => map.set(s.name, s))
    return map
  }, [filteredData])

  const completeSilhouettes = useMemo(() => {
    if (!silhouettesMap) return []
    return silhouettes.map((s) => {
      const filteredVersion = silhouettesMap.get(s.name) ?? null
      return {
        ...s,
        filtered: filteredVersion,
        isFiltered: filteredVersion !== null,
      }
    })
  }, [silhouettes, silhouettesMap])

  const selectedSilhouettesData = useMemo(() => {
    return completeSilhouettes.filter((s) => includes(selectedSilhouettesNames, s.name))
  }, [completeSilhouettes, selectedSilhouettesNames])

  const selectedIDs = useMemo(() => {
    const IDsFromSilhouettes = selectedSilhouettesData
      .flatMap((s) => (s.isFiltered ? s.filtered.trajectories : s.trajectories)) // Modern alternative to .map().flat()
      .map((t) => t[0]?.id) // Use optional chaining to prevent crashes
      .filter(Boolean) // Remove any undefined/null values

    const IDsFromTrajectories = selectedTrajectoriesIDs || []
    const type = Number(chartType)

    if (type === 1) {
      /** * INCLUSIVE (OR / UNION)
       * Returns everything selected in BOTH silhouettes and trajectories.
       */
      return union(IDsFromSilhouettes, IDsFromTrajectories)
    }

    if (type === 2 && IDsFromTrajectories.length > 0) {
      /** * EXCLUSIVE (AND / INTERSECTION)
       * Returns only IDs that appear in BOTH categories.
       */
      return [...IDsFromTrajectories]
    }

    // Default fallback (e.g., just Silhouettes)
    return [...IDsFromSilhouettes]
  }, [selectedSilhouettesData, selectedTrajectoriesIDs, chartType])

  console.time("Derived End")

  const value = useMemo(
    () => ({
      filteredData,
      completeLinks,
      filteredSilhouettes,
      completeSilhouettes,
      selectedSilhouettesData,
      selectedIDs,
    }),
    [
      filteredData,
      completeLinks,
      filteredSilhouettes,
      completeSilhouettes,
      selectedSilhouettesData,
      selectedIDs,
    ],
  )

  if (!filteredData) return null
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
