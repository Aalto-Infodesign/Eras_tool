import fs from "fs"
import path from "path"
import { delimitedJSON, readDelimitedRows } from "./dataHelpers"

const fixture = (name) =>
  fs.readFileSync(path.join(__dirname, "../../public/data/tsv", name), "utf8")

// Re-delimit a tab-separated file as CSV, quoting per RFC 4180.
const toCsv = (tsv) =>
  tsv
    .split("\n")
    .map((line) =>
      line
        .split("\t")
        .map((f) => (/[",]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f))
        .join(",")
    )
    .join("\n")

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe.each(["data_demo.tsv", "data_dates.tsv"])("%s", (name) => {
  test("the CSV form parses identically to the TSV form", () => {
    const tsv = fixture(name)
    const fromTsv = delimitedJSON(tsv)
    const fromCsv = delimitedJSON(toCsv(tsv))

    expect(fromTsv.length).toBeGreaterThan(0)
    expect(fromCsv).toEqual(fromTsv)
  })

  test("produces the record shape the pipeline expects", () => {
    const [first] = delimitedJSON(fixture(name))
    expect(first).toEqual({
      FINNGENID: expect.any(String),
      trajectory: expect.any(Array),
      SwitchEventAge: expect.any(Array),
      years: expect.any(Array),
      diseaseDuration: expect.any(Number),
    })
    expect(first.trajectory.length).toBe(first.SwitchEventAge.length)
    expect(first.trajectory.length).toBe(first.years.length)
    expect(first.SwitchEventAge.every(Number.isFinite)).toBe(true)
  })
})

// The parser this replaced: naive split on tabs. TSV output must not change.
const legacyTsvRows = (tsv) => {
  const lines = tsv.split("\n")
  const headers = lines[0].split("\t")
  const result = []
  for (let i = 1; i < lines.length; i++) {
    const obj = {}
    const currentline = lines[i].split("\t")
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = currentline[j]
    result.push(obj)
  }
  return result
}

describe.each(["data_demo.tsv", "data_dates.tsv"])("%s (regression)", (name) => {
  test("TSV records match what the previous naive splitter produced", () => {
    const tsv = fixture(name)
    // compare the row tables, so the shared downstream grouping isn't the thing under test
    const legacy = legacyTsvRows(tsv).filter((d) => d.FINNGENID !== "")
    const [headers, ...body] = readDelimitedRows(tsv)
    const parsed = body
      .filter((cells) => cells.length > 1 || cells[0] !== "")
      .map((cells) => Object.fromEntries(headers.map((h, j) => [h, cells[j] ?? ""])))
      .filter((d) => d.FINNGENID !== "")

    expect(parsed).toHaveLength(legacy.length)
    parsed.forEach((row, i) => {
      Object.entries(legacy[i]).forEach(([k, v]) => {
        expect(row[k]).toBe(v === undefined ? "" : v)
      })
    })
  })
})

const HEADER = "FINNGENID,stage,age,date"
const ROWS = ["P1,a,25,02-09-1969", "P1,b,30,02-09-1974"]

test("a UTF-8 BOM does not corrupt the first column name", () => {
  const out = delimitedJSON("﻿" + [HEADER, ...ROWS].join("\n"))
  expect(out).toHaveLength(1)
  expect(out[0].FINNGENID).toBe("P1")
  expect(out[0].trajectory).toEqual(["a", "b"])
})

test("a comma-delimited file is detected as CSV", () => {
  const out = delimitedJSON([HEADER, ...ROWS].join("\n"))
  expect(out).toHaveLength(1)
  expect(out[0].FINNGENID).toBe("P1")
  expect(out[0].trajectory).toEqual(["a", "b"])
  expect(out[0].SwitchEventAge).toEqual([25, 30])
})

test("a tab-delimited file is still detected as TSV", () => {
  const out = delimitedJSON(
    [HEADER, ...ROWS].map((l) => l.replace(/,/g, "\t")).join("\n")
  )
  expect(out).toHaveLength(1)
  expect(out[0].trajectory).toEqual(["a", "b"])
})

test("quoted CSV fields containing the delimiter survive", () => {
  const out = delimitedJSON(
    ['FINNGENID,stage,age,date', 'P1,"stage a, mild",25,02-09-1969'].join("\n")
  )
  expect(out[0].trajectory).toEqual(["stage a, mild"])
})

test("CRLF line endings do not leak into values", () => {
  const out = delimitedJSON([HEADER, ...ROWS].join("\r\n"))
  expect(out[0].trajectory).toEqual(["a", "b"])
  expect(out[0].SwitchEventAge).toEqual([25, 30])
})

test("a trailing newline does not create a phantom record", () => {
  const out = delimitedJSON([HEADER, ...ROWS].join("\n") + "\n")
  expect(out).toHaveLength(1)
  expect(out[0].trajectory).toEqual(["a", "b"])
})

test("rows with an empty patient id are dropped", () => {
  const out = delimitedJSON([HEADER, ",x,1,02-09-1969", ...ROWS].join("\n"))
  expect(out).toHaveLength(1)
  expect(out[0].FINNGENID).toBe("P1")
})
