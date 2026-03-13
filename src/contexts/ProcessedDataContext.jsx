import { createContext, useState, useContext, useMemo, useEffect, useCallback } from "react"
import { useRawData } from "./RawDataContext"

import { useDataCleanup, useDataProcessing } from "../components/hooks/useDataProcessing"

import { tsvJSON } from "../utils/dataHelpers"

import { xor } from "lodash"

const ProcessedDataContext = createContext(null)

export function ProcessedDataProvider({ children }) {
  const { rawData, fileName } = useRawData()
  const [clusterStates, setClusterStates] = useState(false) // Option in import
  const [removedStates, setRemovedStates] = useState([]) // Edited in States Selection

  const [statesOrder, setStatesOrder] = useState([])

  // from Flowchart
  const [idealSilhouettes, setIdealSilhouettes] = useState([])
  const [statesThresholds, setStatesThresholds] = useState([])

  // Cleanup
  useEffect(() => {
    setRemovedStates([])
    setIdealSilhouettes([])
    setStatesThresholds([])
    setStatesOrder([])
  }, [fileName])

  // Take Raw Data and parse it based on file format
  const parsedData = useMemo(() => {
    if (rawData.length === 0) return null
    console.time("parse data")
    // 1. Determine type and Parse
    let parsed
    if (fileName?.endsWith(".tsv") || fileName?.endsWith(".txt")) {
      parsed = tsvJSON(rawData)
    } else if (typeof rawData === "string") {
      parsed = JSON.parse(rawData)
    } else {
      parsed = rawData
    }

    // 2. Apply further processing (Clustering)
    const baseData = clusterStates ? clusterStatesFunc(parsed) : parsed
    console.timeEnd("parse data")
    return baseData
  }, [fileName, clusterStates])

  // Remove states from parsed data
  const data = useMemo(() => {
    if (!parsedData) return []
    return parsedData.map((d) => {
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
  }, [parsedData, removedStates])

  const richData = useDataCleanup(data, statesThresholds)

  const { statesData, analytics, silhouettes, filters } = useDataProcessing(
    richData,
    idealSilhouettes,
  )

  useEffect(() => {
    if (!statesData.statesNames) return
    const removed = new Set(removedStates)
    setStatesOrder(statesData.statesNames.filter((s) => !removed.has(s)))
  }, [statesData.statesNames, removedStates])

  const existingIdealSilhouettes = useMemo(
    () =>
      silhouettes.length > 0 ? silhouettes.filter((s) => idealSilhouettes.includes(s.name)) : [],
    [silhouettes, idealSilhouettes],
  )

  const addStateThreshold = useCallback((obj) => {
    setStatesThresholds((prev) => {
      const exists = prev.some(
        (item) => item.sourceState === obj.sourceState && item.targetState === obj.targetState,
      )

      if (exists) {
        // Either skip or replace — here we replace:
        return prev.map((item) =>
          item.sourceState === obj.sourceState && item.targetState === obj.targetState ? obj : item,
        )
      }

      return [...prev, obj]
    })
  }, []) // No deps needed since it uses the functional updater form

  const removeStateThreshold = useCallback((obj) => {
    setStatesThresholds((prev) =>
      prev.filter(
        (item) => !(item.sourceState === obj.sourceState && item.targetState === obj.targetState),
      ),
    )
  }, [])

  const toggleRemovedState = useCallback(
    (state) => {
      const newRemovedStates = xor(removedStates, [state])
      setRemovedStates(newRemovedStates)
    },
    [removedStates, setRemovedStates],
  )

  const value = useMemo(
    () => ({
      // State
      richData,
      idealSilhouettes,
      existingIdealSilhouettes,
      removedStates,
      clusterStates,
      statesData,
      analytics,
      silhouettes,
      filtersBlueprint: filters,
      statesOrder,
      // Setters
      setIdealSilhouettes,
      setClusterStates,
      setStatesOrder,
      toggleRemovedState,
      // From Flowhchart
      statesThresholds,
      addStateThreshold,
      removeStateThreshold,
    }),
    [
      richData,
      idealSilhouettes,
      statesOrder,
      existingIdealSilhouettes,
      removedStates,
      clusterStates,
      statesData,
      analytics,
      silhouettes,
      filters,
      statesThresholds,
      addStateThreshold,
    ],
  )

  return <ProcessedDataContext.Provider value={value}>{children}</ProcessedDataContext.Provider>
}

// Custom hook to use the data context
export function useData() {
  const context = useContext(ProcessedDataContext)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

// HELPERS
function clusterStatesFunc(data) {
  return data.map((patient) => {
    // Create copies of the arrays to avoid changing the original data
    const trajectory = [...patient.trajectory]
    const ages = [...patient.SwitchEventAge]
    const years = [...patient.years]

    // Iterate backwards to safely remove elements from the arrays
    for (let i = ages.length - 1; i > 0; i--) {
      // Check if the current event's age is the same as the previous one's
      if (ages[i] === ages[i - 1]) {
        // If they match, combine the state from the current event into the previous one
        trajectory[i - 1] = trajectory[i - 1] + "-" + trajectory[i]

        // Remove the now-redundant data from the current index (i)
        trajectory.splice(i, 1)
        ages.splice(i, 1)
        years.splice(i, 1)
      }
    }

    // Return a new patient object with the potentially modified data
    return {
      ...patient,
      trajectory,
      SwitchEventAge: ages,
      years,
    }
  })
}
