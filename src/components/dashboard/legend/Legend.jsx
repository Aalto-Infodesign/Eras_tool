import styles from "./Legend.module.css"
import { motion } from "motion/react"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"

export function Legend() {
  const { scales } = useData()
  const { palette, statesOrder } = useViz()

  return (
    <motion.div layout className={styles.legend}>
      {statesOrder.map((state, index) => (
        <motion.p layout key={state} className={styles.legendItem}>
          <span className={styles.legendColor}>{index} - </span>
          <span className={styles.legendLabel} style={{ color: palette[state] }}>
            {scales.indexToName(state)}
          </span>
        </motion.p>
      ))}
    </motion.div>
  )
}
