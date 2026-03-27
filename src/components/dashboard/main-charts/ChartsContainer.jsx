import { motion } from "motion/react"
import "./ChartsContainer.css"
import { PartialOrderChart } from "./partial-order/PartialOrderChart"
import { TrajectoriesChart } from "./trajectories/TrajectoriesChart"
import { ChartsProvider } from "./ChartsContext"
import { DownloadPanel } from "../../common/ExportPanel/DownloadPanel"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"

import Button from "../../common/Button/Button"
import { ShortcutSpan } from "../../common/ShortcutSpan/ShortcutSpan"

export function ChartsContainer() {
  console.time("Explorer Chart")
  // Props

  const { statesOrder } = useData()
  const { chartType, setChartType } = useViz()

  const chartRowSpan = Math.floor(statesOrder.length / 6) + 1

  console.timeEnd("Explorer Chart")

  return (
    <motion.section
      layout
      key={"chart"}
      className="bento-item chart"
      style={{ gridRow: `span ${chartRowSpan}` }}
    >
      {/* TODO! Toggle between chart types */}
      <motion.div layout className="function-row">
        <div className="chart-modes">
          <Button size="xs" onClick={() => setChartType(1)} data-selected={chartType === 1}>
            <ShortcutSpan separator={"–"}>1</ShortcutSpan> Parallel
          </Button>
          <Button size="xs" onClick={() => setChartType(2)} data-selected={chartType === 2}>
            <ShortcutSpan separator={"–"}>2</ShortcutSpan> Linear
          </Button>
        </div>
        <DownloadPanel />
      </motion.div>
      <div>
        <ChartsProvider>
          <motion.section
            key={chartType}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="chart-wrapper"
            // className="trajectories-chart"
          >
            {chartType === 1 && <PartialOrderChart />}
            {chartType === 2 && <TrajectoriesChart />}
          </motion.section>
        </ChartsProvider>
      </div>
    </motion.section>
  )
}
