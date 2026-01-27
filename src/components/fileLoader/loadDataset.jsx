import { useState } from "react"
import { select } from "d3"
import { UploadIcon } from "../common/icons/Icons"
import { isNil, groupBy } from "lodash"
import Button from "../common/Button/Button.jsx"

import { useRawData } from "../../contexts/RawDataContext.jsx"

// import { max, min } from "d3"

const FILE_TYPES = ["json", "tsv", "csv"]

const LoadDataset = (props) => {
  // Pull only the trigger function and current metadata from context
  // const { loadData, fileName, fileExtention, status } = useRawData();

  // const isUploading = status === 'loading';

  const { setLoadedData = () => {} } = props
  const { setWorkingData = () => {} } = props
  const { clusterStates } = props

  const [fileName, setFileName] = useState(null)
  const [fileExtention, setFileExtention] = useState(null)

  //TODO -> Se dataset è TSV, usare TSVtoJSON()
  function loadData(file = null) {
    // Aggiorna l'interfaccia utente (UI) per indicare l'upload in corso
    select("#fileInput").html("Uploading dataset...")

    // --- Nuova Logica: Gestione di File di Template (Percorsi) ---
    if (typeof file === "string") {
      const filePath = file

      // 1. Usa fetch per caricare il contenuto del file template
      fetch(filePath)
        .then((response) => {
          // Estrae il nome e l'estensione del file
          const pathParts = filePath.split("/")
          const fileNameWithExt = pathParts[pathParts.length - 1]
          const fileParts = fileNameWithExt.split(".")
          const fileName = fileParts[0]
          const fileExtention = fileParts.pop().toLowerCase()

          // 2. Determina il tipo di contenuto (JSON o TSV) basandosi sull'estensione
          if (fileExtention === "json") {
            return response.json() // Gestisce la risposta come JSON
          } else if (fileExtention === "tsv" || fileExtention === "txt") {
            return response.text().then((text) => {
              // Se TSV/testo, converte in JSON (assumendo che tsvJSON sia disponibile)
              return tsvJSON(text)
            })
          }
          throw new Error("Unsupported file type for template.")
        })
        .then((data) => {
          // 3. Processa e imposta i dati come faresti con l'upload
          console.log(data)
          setFileName(fileName)
          setFileExtention(fileExtention)

          const newWorkingData = clusterStates ? clusterStatesFunc(data) : data

          setLoadedData(newWorkingData)
          setWorkingData(newWorkingData)
        })
        .catch((error) => {
          console.error("Error loading template file:", error)
          // Puoi aggiungere qui una logica per mostrare un errore all'utente
        })

      return // Termina la funzione dopo aver avviato il fetch
    }
    // --- Fine Nuova Logica ---

    // --- Logica Esistente: Gestione di File Uploadati (da <input>) ---
    const reader = new FileReader()
    const dataFile = document.getElementById("fileInput").files[0]
    // ... (restante codice per la gestione di FileReader rimane invariato)

    console.log(dataFile)

    let isJSON = true

    if (dataFile.type === "text/tab-separated-values") {
      console.log("This is a TSV")
      isJSON = false
    }
    if (dataFile.type === "application/json") {
      console.log("This is a JSON")
      isJSON = true
    }
    reader.readAsText(dataFile, "UTF-8")

    reader.onload = () => {
      console.log(reader)

      const data = isJSON ? JSON.parse(reader.result) : tsvJSON(reader.result.toString())

      console.log(data)

      setFileName(dataFile.name.split(".")[0])
      setFileExtention(dataFile.name.split(".").pop().toLowerCase())

      const newWorkingData = clusterStates ? clusterStatesFunc(data) : data

      setLoadedData(newWorkingData)
      setWorkingData(newWorkingData)
    }
  }
  return (
    <section id="upload">
      <label htmlFor="fileInput" className="file-input-label animated">
        <UploadIcon size={12} />
        <span>{isNil(fileName) ? "Upload" : fileName.slice(0, 10) + "..."}</span>
        {!isNil(fileExtention) && (
          <span
            className={`filetype badge ${FILE_TYPES.includes(fileExtention) ? "right" : "wrong"}`}
          >
            {fileExtention.toUpperCase()}
          </span>
        )}
      </label>

      <input id="fileInput" type="file" onChange={loadData} />

      {/* Template 1 - JSON */}
      {!fileName && (
        <div className="template-buttons">
          <Button
            onClick={() => loadData("../data/json/data_semilinear_dates_20250716_154750.json")}
            size="small"
          >
            Clusters
          </Button>
          <Button onClick={() => loadData("../data/json/data_semilinear_dates.json")} size="small">
            Dates
          </Button>
          <Button
            onClick={() => loadData("../data/json/data_semilinear_dates_big.json")}
            size="small"
          >
            Big
          </Button>
          <Button onClick={() => loadData("../data/json/data_25k.json")} size="small">
            25K
          </Button>
        </div>
      )}
    </section>
  )
}

export default LoadDataset

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
