import { groupBy } from "lodash"

import { dateToFractionalYear } from "../utils/numberHelpers"

// Tab- and comma-separated event tables are both accepted (one row per state
// entry). The delimiter is sniffed from the header rather than taken from the
// extension, so a mislabelled or generic `.txt` file still parses; ties go to tab.
function sniffDelimiter(header) {
  const count = (re) => (header.match(re) || []).length
  return count(/,/g) > count(/\t/g) ? "," : "\t"
}

// Minimal RFC 4180 reader. A plain `split(delimiter)` is not enough for CSV:
// quoted fields may contain the delimiter, line breaks, and "" escapes.
function readRows(text, delimiter) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  let i = 0

  const endField = () => {
    row.push(field)
    field = ""
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const c = text[i]

    if (quoted) {
      if (c !== '"') {
        field += c
        i += 1
      } else if (text[i + 1] === '"') {
        field += '"' // escaped quote
        i += 2
      } else {
        quoted = false
        i += 1
      }
      continue
    }

    if (c === '"' && field === "") {
      quoted = true
      i += 1
    } else if (c === delimiter) {
      endField()
      i += 1
    } else if (c === "\n") {
      endRow()
      i += 1
    } else if (c === "\r") {
      endRow()
      i += text[i + 1] === "\n" ? 2 : 1
    } else {
      field += c
      i += 1
    }
  }
  // last row when the file has no trailing newline
  if (field !== "" || row.length > 0) endRow()

  return rows
}

// Raw cell table (header row included) from a tab- or comma-separated file.
export function readDelimitedRows(text) {
  // Excel-exported CSVs are commonly BOM-prefixed, which would otherwise become
  // part of the first header name and hide the FINNGENID column.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const firstBreak = clean.search(/\r|\n/)
  const header = firstBreak === -1 ? clean : clean.slice(0, firstBreak)

  return readRows(clean, sniffDelimiter(header))
}

export function delimitedJSON(text) {
  const [headers = [], ...body] = readDelimitedRows(text)

  const records = body
    // skip blank lines, which read as a single empty field
    .filter((cells) => cells.length > 1 || cells[0] !== "")
    .map((cells) => Object.fromEntries(headers.map((h, j) => [h, cells[j] ?? ""])))

  return formatEventRows(records)
}

function formatEventRows(data) {
  console.log("Input Data", data)

  // Check and remove rows with no patient id
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

export const snakeCase = (string) => {
  return string
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join("_")
}
