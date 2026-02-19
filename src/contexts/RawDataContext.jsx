// RawDataContext.js
import { createContext, useState, useContext } from "react"

export const RawDataContext = createContext()

export const RawDataProvider = ({ children }) => {
  const [rawData, setRawData] = useState([])
  const [status, setStatus] = useState("idle") // idle | loading | success | error
  const [fileName, setFileName] = useState(null)

  function loadData(input) {
    setStatus("loading")

    if (typeof input === "string") {
      // Template Fetch
      fetch(input)
        .then((res) => (res.ok ? res.text() : Promise.reject()))
        .then((text) => {
          setRawData(text) // Store raw text
          setFileName(input.split("/").pop())
          setStatus("success")
        })
        .catch(() => setStatus("error"))
    } else {
      // File Upload
      const reader = new FileReader()
      reader.onload = () => {
        setRawData(reader.result) // Store raw text
        setFileName(input.name)
        setStatus("success")
      }
      reader.readAsText(input)
    }
  }

  return (
    <RawDataContext.Provider value={{ rawData, status, loadData, fileName }}>
      {children}
    </RawDataContext.Provider>
  )
}

// Custom hook to use the data context
export function useRawData() {
  const context = useContext(RawDataContext)
  if (!context) {
    throw new Error("useRawData must be used within a RawDataProvider")
  }
  return context
}
