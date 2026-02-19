import { useMemo } from "react"
import { useData } from "../contexts/ProcessedDataContext"
import { useFilters } from "../contexts/FiltersContext"

import {
  trajectoriesFromData,
  silhouettesFromTrajectories,
} from "../components/hooks/useDataProcessing"
export const useDerivedData = () => {
  const { silhouettes, richData, idealSilhouettes } = useData()
  const { filters } = useFilters()

  // Step 1: filter raw data
  const filteredData = useMemo(() => {
    return richData.filter(
      (datum) =>
        datum.diseaseDuration === null ||
        (datum.diseaseDuration >= filters.diseaseDuration.selection[0] &&
          datum.diseaseDuration <= filters.diseaseDuration.selection[1]),
    )
  }, [richData, filters])

  // Step 2: derive silhouettes from filtered data
  const silhouettesMap = useMemo(() => {
    const trajectories = trajectoriesFromData(filteredData)
    const filtered = silhouettesFromTrajectories(trajectories, idealSilhouettes, richData)

    const map = new Map()
    filtered.forEach((s) => map.set(s.name, s))
    return map
  }, [filteredData, idealSilhouettes, richData])

  const completeSilhouettes = useMemo(() => {
    return silhouettes.map((s) => {
      const filteredVersion = silhouettesMap.get(s.name) ?? null
      return {
        ...s,
        filtered: filteredVersion,
        isFiltered: filteredVersion !== null,
      }
    })
  }, [silhouettes, silhouettesMap])

  return { filteredData, completeSilhouettes }
}
