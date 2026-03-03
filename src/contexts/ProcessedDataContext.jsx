import { createContext, useState, useContext, useMemo } from "react"
import { useRawData } from "./RawDataContext"

import { scaleOrdinal } from "d3"

import { useDataCleanup, useDataProcessing } from "../components/hooks/useDataProcessing"

import { tsvJSON } from "../utils/dataHelpers"

const ProcessedDataContext = createContext(null)

export function ProcessedDataProvider({ children }) {
  const { rawData, fileName } = useRawData()
  const [clusterStates, setClusterStates] = useState(false) // Option in import
  const [removedStates, setRemovedStates] = useState([]) // Edited in States Selection

  // from Flowchart
  const [idealSilhouettes, setIdealSilhouettes] = useState([])
  const [statesThresholds, setStatesThresholds] = useState([])

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
  }, [rawData, fileName])

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

  // Create converion scales from Data
  const scales = useMemo(() => {
    if (!data || data.length === 0) return null
    const states = data
      .map((d) => d.trajectory)
      .flat()
      .filter((e, n, l) => l.indexOf(e) === n)
      .map((state) => ({
        name: state,
      }))

    const statesNames = states.map((state) => state.name)

    // TODO FUnc che chiude con φ

    // Index them based on their order
    const stateIndexes = statesNames.map((_t, i) => `${i}`)

    // Using the array and indexes to create two ordinal scales
    const scales = {
      nameToIndex: scaleOrdinal(statesNames, stateIndexes),
      indexToName: scaleOrdinal(stateIndexes, statesNames),
    }

    return scales
  }, [data])

  const richData = useDataCleanup(data, scales, statesThresholds)

  const { statesData, analytics, silhouettes, filters } = useDataProcessing(
    richData,
    idealSilhouettes,
  )

  const existingIdealSilhouettes = useMemo(
    () =>
      silhouettes.length > 0 ? silhouettes.filter((s) => idealSilhouettes.includes(s.name)) : [],
    [silhouettes, idealSilhouettes],
  )

  const addStateThreshold = (obj) => {
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
  }
  const value = useMemo(
    () => ({
      // State
      richData,
      scales,
      idealSilhouettes,
      existingIdealSilhouettes,
      removedStates,
      clusterStates,
      statesData,
      analytics,
      silhouettes,
      filtersBlueprint: filters,
      // Setters
      setIdealSilhouettes,
      setClusterStates,
      setRemovedStates,

      // From Flowhchart
      statesThresholds,
      addStateThreshold,
    }),
    [
      richData,
      scales,
      idealSilhouettes,

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
