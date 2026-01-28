import { createContext, useState, useContext, useEffect, useMemo } from "react"
import { useRawData } from "./RawDataContext"
import { groupBy } from "lodash"

import { scaleOrdinal } from "d3"

import { useDataProcessing } from "../components/hooks/useDataProcessing"

const ProcessedDataContext = createContext(null)

export function ProcessedDataProvider({ children }) {
  const { rawData, fileName } = useRawData()
  const [clusterStates, setClusterStates] = useState(false) // Option in import
  const [removedStates, setRemovedStates] = useState([]) // Edited in States Selection
  const [idealSilhouettes, setIdealSilhouettes] = useState([])

  useEffect(() => {
    if (rawData.length > 0) console.log("Raw data", rawData)
  }, [rawData])

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

  const { richData, statesData, analytics, silhouettes, filters } = useDataProcessing(
    data,
    scales,
    idealSilhouettes,
  )

  const value = useMemo(
    () => ({
      // State
      richData,
      scales,
      idealSilhouettes,
      removedStates,
      clusterStates,
      statesData,
      analytics,
      silhouettes,
      filters,
      // Setters
      setIdealSilhouettes,
      setClusterStates,
      setRemovedStates,
    }),
    [
      richData,
      scales,
      idealSilhouettes,
      removedStates,
      clusterStates,
      statesData,
      analytics,
      silhouettes,
      filters,
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

function tsvJSON(tsv) {
  const lines = tsv.split("\n")
  const result = []
  const headers = lines[0].split("\t")

  for (let i = 1; i < lines.length; i++) {
    const obj = {}
    const currentline = lines[i].split("\t")

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j]
    }

    result.push(obj)
  }

  return formatTsvData(result)
}

function formatTsvData(data) {
  console.log("Input Data", data)

  // Check and remove empty TSV lines
  const dataClean = data.filter((d) => d.FINNGENID !== "")

  const groupedByFINNGENID = groupBy(dataClean, "FINNGENID")

  console.log("Grouped by FINNGENID", Object.entries(groupedByFINNGENID))

  const newObject = Object.entries(groupedByFINNGENID).map(([key, value]) => {
    const newID = key
    const newTrajectory = value.map((v) => v.stage)
    const newSwitchEventAge = value.map((v) => Number(v.age))
    const newYears = value.map((v) => dateToFractionalYear(v.date))
    // const newYears = value.map((v) => Number(v.year))

    // const diseaseDuration = max(newSwitchEventAge) - min(newSwitchEventAge)
    const diseaseDuration = value[0].disease_duration
      ? Number(value[0].disease_duration)
      : newYears[newYears.length - 1] - newYears[0]
    // const diseaseDuration = Number(value[0].disease_duration)

    // TODO order by age or date?

    return {
      FINNGENID: newID,
      trajectory: newTrajectory,
      SwitchEventAge: newSwitchEventAge,
      years: newYears,
      diseaseDuration: diseaseDuration,
    }
  })

  return newObject
}

function dateToFractionalYear(dateInput, decimals = 6) {
  let date

  // 1. Handle Date objects
  if (dateInput instanceof Date) {
    date = dateInput
  }
  // 2. Handle Numbers (Unix Timestamps in ms)
  else if (typeof dateInput === "number") {
    date = new Date(dateInput)
  }
  // 3. Handle Strings
  else if (typeof dateInput === "string") {
    // Try to normalize separators (replace dots or slashes with dashes)
    const normalized = dateInput.replace(/[\.\/]/g, "-")

    // Pattern: YYYY-MM-DD (ISO)
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(normalized)) {
      date = new Date(normalized)
    }
    // Pattern: DD-MM-YYYY (European)
    else if (/^\d{1,2}-\d{1,2}-\d{4}/.test(normalized)) {
      const [d, m, y] = normalized.split("-").map(Number)
      date = new Date(y, m - 1, d)
    }
    // Fallback: Let the native parser try (for "Month Day, Year" etc.)
    else {
      date = new Date(dateInput)
    }
  }

  // Validation
  if (!date || isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${dateInput}`)
  }

  const year = date.getFullYear()
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)

  // Math: (Current - Start) / (Total ms in that specific year)
  const fraction = (date - start) / (end - start)
  const fractionalYear = year + fraction

  return Number(fractionalYear.toFixed(decimals))
}
