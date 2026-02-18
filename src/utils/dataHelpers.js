import { groupBy } from "lodash"

import { dateToFractionalYear } from "../utils/numberHelpers"

export function tsvJSON(tsv) {
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

  // Order by date
  const groupedAndSorted = Object.entries(groupedByFINNGENID).map(([key, value]) => {
    const sorted = value.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA - dateB
    })
    return [key, sorted]
  })

  console.log("Grouped and Sorted", groupedAndSorted)

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
