import Button from "../common/Button/Button.jsx"
import { useRawData } from "../../contexts/RawDataContext.jsx"
import { Upload } from "lucide-react"

const LoadDataset = () => {
  const { loadData, fileName, fileExtention, status } = useRawData()

  const isUploading = status === "loading"

  return (
    <section id="upload">
      <label htmlFor="fileInput" className={`file-input-label ${isUploading ? "loading" : ""}`}>
        <Upload size={12} />
        <span>{fileName ? `${fileName.slice(0, 10)}...` : "Upload"}</span>
        {fileExtention && <span className="filetype badge">{fileExtention.toUpperCase()}</span>}
      </label>

      <input
        id="fileInput"
        type="file"
        onChange={(e) => loadData(e.target.files[0])}
        disabled={isUploading}
      />

      {/* Template 1 - JSON */}

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
    </section>
  )
}

export default LoadDataset
