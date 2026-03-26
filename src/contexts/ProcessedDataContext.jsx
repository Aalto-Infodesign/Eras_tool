import { createContext, useState, useContext, useMemo, useEffect, useCallback } from "react"
import { useRawData } from "./RawDataContext"

import {
  useAnalytics,
  useDataCleanup,
  useStates,
  useTrajectoriesFromData,
  useSilhouettesFromTrajectories,
} from "../components/hooks/useDataProcessing"

import { tsvJSON } from "../utils/dataHelpers"
import { useDebouncedState } from "hamo"

const ProcessedDataContext = createContext(null)

export function ProcessedDataProvider({ children }) {
  const { rawData, fileName } = useRawData()
  const [clusterStates, setClusterStates] = useState(false) // Option in import

  const [statesOrder, setStatesOrder] = useDebouncedState([], 10)

  // from Flowchart
  const [idealSilhouettes, setIdealSilhouettes] = useState([])
  const [statesThresholds, setStatesThresholds] = useState([])

  // Cleanup
  useEffect(() => {
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

  const richData = useDataCleanup(parsedData, statesThresholds)
  const statesData = useStates(richData)
  const trajectories = useTrajectoriesFromData(richData)
  const silhouettes = useSilhouettesFromTrajectories(trajectories, idealSilhouettes, richData)
  const analytics = useAnalytics(richData)

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

  useEffect(() => {
    if (!statesData.statesNames) return
    setStatesOrder(statesData.statesNames)
  }, [statesData.statesNames])

  const value = useMemo(
    () => ({
      // State
      richData,
      idealSilhouettes,
      existingIdealSilhouettes,

      clusterStates,
      statesData,
      analytics,
      trajectories,
      silhouettes,
      statesOrder,
      // Setters
      setIdealSilhouettes,
      setClusterStates,
      setStatesOrder,

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

      clusterStates,
      statesData,
      analytics,
      trajectories,
      silhouettes,
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
