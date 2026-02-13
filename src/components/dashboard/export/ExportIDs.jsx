import { Virtuoso } from "react-virtuoso"
import Button from "../../common/Button/Button.jsx"
import { downloadIDs } from "../../../utils/exportFunctions.js"
import { motion } from "motion/react"
import { Download } from "lucide-react"

export function ExportIDs({ selectedIDs }) {
  return (
    <motion.div layout className="export-ids-panel">
      {selectedIDs.length === 0 && <motion.p layout>No silhouette selected</motion.p>}
      {selectedIDs.length > 0 && (
        <>
          <Virtuoso
            style={{ height: 150, width: "100%", marginBottom: 10 }}
            data={selectedIDs}
            itemContent={(index, id) => {
              return (
                <div key={id}>
                  <h4>{id}</h4>
                </div>
              )
            }}
          />
          <Button
            className="btn"
            size="small"
            variant="secondary"
            style={{ gap: 10 }}
            onClick={(e) => {
              downloadIDs(e, selectedIDs)
            }}
          >
            <Download size={12} />
            <span>{selectedIDs.length} IDs</span>
          </Button>
        </>
      )}
    </motion.div>
  )
}
