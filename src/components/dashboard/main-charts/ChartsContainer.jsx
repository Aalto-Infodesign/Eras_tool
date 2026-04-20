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
import { ArcContainer } from "./arc-chart/ArcChart"

export function ChartsContainer() {
  console.time("Charts Container")
  // Props

  const { statesOrder } = useData()
  const { chartType, setChartType } = useViz()

  const chartRowSpan = Math.floor(statesOrder.length / 6) + 1

  const controlButtons = [
    { label: "Parallel", code: 1 },
    { label: "Linear", code: 2 },
    // { label: "Arc", code: 3 },
  ]

  console.timeEnd("Charts Container")
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
          {controlButtons.map((b) => (
            <Button
              key={"button-" + b.label}
              size="xs"
              keystroke={String(b.code)}
              onClick={() => setChartType(b.code)}
              data-selected={chartType === b.code}
            >
              <p>
                <ShortcutSpan separator={"–"}>{b.code}</ShortcutSpan> {b.label}
              </p>
            </Button>
          ))}
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
            {/* {chartType === 3 && <ArcContainer />} */}
          </motion.section>
        </ChartsProvider>
      </div>
    </motion.section>
  )
}
