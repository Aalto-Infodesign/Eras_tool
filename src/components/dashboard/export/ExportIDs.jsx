import { Virtuoso } from "react-virtuoso"
import Button from "../../common/Button/Button.jsx"
import { downloadIDs } from "../../../utils/exportFunctions.js"
import { motion } from "motion/react"

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
            onClick={(e) => {
              downloadIDs(e, selectedIDs)
            }}
          >
            EXPORT {selectedIDs.length} IDs
          </Button>
        </>
      )}
    </motion.div>
  )
}
