import styles from "./Legend.module.css"
import { motion } from "motion/react"
export function Legend({ statesOrder, palette, indexToName }) {
  return (
    <motion.div layout className={styles.legend}>
      {statesOrder.map((state, _index) => (
        <motion.p layout key={state} className={styles.legendItem}>
          <span className={styles.legendColor}>{state} - </span>
          <span className={styles.legendLabel} style={{ color: palette[state] }}>
            {indexToName(state)}
          </span>
        </motion.p>
      ))}
    </motion.div>
  )
}
