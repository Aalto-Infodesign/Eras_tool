import Button from "../common/Button/Button.jsx"
import { useRawData } from "../../contexts/RawDataContext.jsx"
import { Upload } from "lucide-react"
import { motion } from "motion/react"
import { useMemo } from "react"
import { useModifierKey } from "../hooks/useModifierKey.js"

const LoadDataset = () => {
  const { loadData, fileName, fileExtention, status } = useRawData()

  const isUploading = status === "loading"

  useModifierKey(
    "1",
    () => !fileName && loadData("../data/json/data_semilinear_dates_20250716_154750.json"),
  )
  useModifierKey("2", () => !fileName && loadData("../data/json/data_semilinear_dates.json"))
  useModifierKey("3", () => !fileName && loadData("../data/json/data_25k.json"))

  const templateVariants = {
    hidden: {
      visibility: "hidden",
      opacity: 0,
      height: 0,
      transition: { duration: 0.15 },
    },
    visible: {
      visibility: "visible",
      opacity: 1,
      height: "auto",
      transition: { duration: 0.15 },
    },
  }

  const label = useMemo(() => {
    if (!fileName) return "Upload"

    if (fileName.length > 25) return `${fileName.slice(0, 25)}...`

    return fileName
  }, [fileName])

  return (
    <motion.section
      id="upload"
      // layout
      className="upload-section"
      initial="hidden"
      whileHover="visible"
    >
      <div></div>
      <div>
        <label htmlFor="fileInput" className={`file-input-label ${isUploading ? "loading" : ""}`}>
          <Upload size={14} />
          <span>{label}</span>
          {fileExtention && <span className="filetype badge">{fileExtention.toUpperCase()}</span>}
        </label>
        <input
          id="fileInput"
          type="file"
          onChange={(e) => loadData(e.target.files[0])}
          disabled={isUploading}
        />
      </div>

      <motion.div className="template-buttons" variants={templateVariants}>
        <Button
          onClick={() => loadData("../data/json/data_semilinear_dates_20250716_154750.json")}
          size="small"
        >
          Clusters
        </Button>
        <Button onClick={() => loadData("../data/json/data_semilinear_dates.json")} size="small">
          Dates
        </Button>

        <Button onClick={() => loadData("../data/json/data_25k.json")} size="small">
          25K
        </Button>
      </motion.div>
    </motion.section>
  )
}

export default LoadDataset
