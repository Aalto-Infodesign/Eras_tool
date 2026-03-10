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
  trajectoriesFromData,
  silhouettesFromTrajectories,
} from "../components/hooks/useDataProcessing"
import { useViz } from "./VizContext"

const DerivedContext = createContext(null)

export function DerivedDataProvider({ children }) {
  const { silhouettes, richData, idealSilhouettes } = useData()
  const {
    filters,
    filtersActive,
    selectedSilhouettesNames,
    selectedTrajectoriesIDs,
    trajectoriesSelectionMode,
  } = useFilters()
  const { chartType } = useViz()

  // console.log("Silhouettes", silhouettes)

  const isReady = silhouettes?.length > 0 && richData?.length > 0 && !isEmpty(filters)

  const filteredData = useMemo(() => {
    if (!isReady) return []

    if (!filtersActive) return richData

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
  }, [richData, filters, filtersActive])

  // console.log("fd", filteredData)

  const filteredTrajectories = useMemo(() => {
    if (filteredData.length === 0) return []
    return trajectoriesFromData(filteredData)
  }, [filteredData])

  const completeLinks = useMemo(() => {
    return filteredTrajectories.flat()
  }, [filteredTrajectories])

  const filteredSilhouettes = useMemo(() => {
    if (filteredTrajectories.length === 0) return []
    return silhouettesFromTrajectories(filteredTrajectories, idealSilhouettes, richData)
  }, [filteredTrajectories, idealSilhouettes, richData])

  // Step 2: derive silhouettes from filtered data
  const silhouettesMap = useMemo(() => {
    if (filteredSilhouettes.length === 0 || !filtersActive) return new Map()

    const map = new Map()
    filteredSilhouettes.forEach((s) => map.set(s.name, s))
    return map
  }, [filteredSilhouettes, filtersActive])

  const completeSilhouettes = useMemo(() => {
    if (!silhouettesMap) return []

    // console.log(silhouettesMap)
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
    if (selectedSilhouettesNames && selectedSilhouettesNames.length === 0) return []
    return completeSilhouettes.filter((s) => includes(selectedSilhouettesNames, s.name))
  }, [completeSilhouettes, selectedSilhouettesNames])

  const linksBySelectedSilhouettes = useMemo(() => {
    console.time("Selected Links")
    const s = selectedSilhouettesData.length === 0 ? silhouettes : selectedSilhouettesData
    const individuals = new Set(flattenDeep(s.map((s) => s.trajectories)).map((t) => t.id))

    console.timeEnd("Selected Links")
    return completeLinks.filter((l) => {
      // Ricerca O(1) invece di O(n)
      if (!individuals.has(l.id)) return false
      // if (hasLumpFilter && !selectedLumpsTypes.has(l.lump)) return false

      return true
    })
  }, [silhouettes, selectedSilhouettesData, completeLinks])

  const filteredLinks = useMemo(() => {
    if (!filtersActive) return linksBySelectedSilhouettes
    const links = linksBySelectedSilhouettes.filter(
      (datum) =>
        datum.speed === null ||
        (Math.floor(datum.speed) >= filters.speed.selection[0] &&
          Math.floor(datum.speed) <= filters.speed.selection[1]),
    )

    if (trajectoriesSelectionMode === "all") return links
    if (trajectoriesSelectionMode === "vertical") return links.filter((l) => l.speed === 0)
    else return links.filter((l) => l.speed !== 0)
  }, [linksBySelectedSilhouettes, trajectoriesSelectionMode, filters, filtersActive])

  const selectedIDs = useMemo(() => {
    if (!selectedSilhouettesData) return []
    const IDsFromSilhouettes = selectedSilhouettesData
      .flatMap((s) => (s.isFiltered ? s.filtered.trajectories : s.trajectories)) // Modern alternative to .map().flat()
      .map((t) => t[0]?.id) // Use optional chaining to prevent crashes
      .filter(Boolean) // Remove any undefined/null values

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
      return union(IDsFromSilhouettes, IDsFromTrajectories)
    }

    // Default fallback (e.g., just Silhouettes)
    return [...IDsFromSilhouettes]
  }, [selectedSilhouettesData, selectedTrajectoriesIDs, chartType])

  const selectedData = useMemo(() => {
    if (selectedIDs.length === 0) return filteredData
    return filteredData.filter((d) => selectedIDs.includes(d.FINNGENID))
  }, [filteredData, selectedIDs])

  const value = useMemo(
    () => ({
      filteredData,
      completeLinks,
      filteredSilhouettes,
      completeSilhouettes,
      selectedSilhouettesData,
      selectedIDs,
      filteredLinks,
      selectedData,
    }),
    [
      filteredData,
      completeLinks,
      filteredSilhouettes,
      completeSilhouettes,
      selectedSilhouettesData,
      selectedIDs,
      filteredLinks,
      selectedData,
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
