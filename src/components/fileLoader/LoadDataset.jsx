import Button from "../common/Button/Button.jsx"
import { useRawData } from "../../contexts/RawDataContext.jsx"
import { Upload } from "lucide-react"
import { motion } from "motion/react"
import { useMemo } from "react"
import { ShortcutSpan } from "../common/ShortcutSpan/ShortcutSpan.jsx"

const LoadDataset = () => {
  const { loadData, fileName, fileExtention, status } = useRawData()

  const isUploading = status === "loading"

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
        <label
          htmlFor="fileInput"
          className={`file-input-label ${isUploading ? "loading" : ""}`}
          aria-label="Upload file"
        >
          <Upload size={12} />
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
        <TemplateButton
          onClick={() =>
            !fileName && loadData("../data/json/data_semilinear_dates_20250716_154750.json")
          }
          shortcut={1}
        >
          Clusters
        </TemplateButton>
        <TemplateButton
          onClick={() => !fileName && loadData("../data/json/data_semilinear_dates.json")}
          shortcut={2}
        >
          Dates
        </TemplateButton>
        <TemplateButton
          onClick={() => !fileName && loadData("../data/json/data_25k.json")}
          shortcut={3}
        >
          25K
        </TemplateButton>
      </motion.div>
    </motion.section>
  )
}

const TemplateButton = ({ children, onClick, shortcut }) => {
  const { fileName } = useRawData()

  return (
    <Button onClick={onClick} size="small" variant="primary" keystroke={String(shortcut)}>
      <p>
        {!fileName && (
          <span>
            <ShortcutSpan>{shortcut}</ShortcutSpan>–
          </span>
        )}
        {children}
      </p>
    </Button>
  )
}

export default LoadDataset
