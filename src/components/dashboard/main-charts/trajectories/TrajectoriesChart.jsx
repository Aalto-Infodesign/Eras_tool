import { useState, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useCharts } from "../ChartsContext"

import { StateTypeDistribution } from "./StatesTypeDistribution"
import { Grid } from "./Grid"

import { TrajectoriesMotion } from "./TrajectoriesMotion"
import { StateDensity } from "./StateDensity"
import { Tooltip } from "../../../common/Tooltip/Tooltip"

import { Lumps } from "./Lumps"

import { TextureDefs } from "../../../common/defs/Textures/TextureDefs"

import { useModifierKey } from "../../../hooks/useModifierKey"

import { useFilters } from "../../../../contexts/FiltersContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import Button from "../../../common/Button/Button"
import { StatesMatrix } from "../../../fileLoader/statesMatrix/StatesMatrix"
import { ChartLine, ListFilter } from "lucide-react"
import { ShortcutSpan } from "../../../common/ShortcutSpan/ShortcutSpan"
import { ArcChart } from "../arc-chart/ArcChart"
import { GradientDefs } from "../../../common/defs/Gradients/GradientDefs"
import { useDebouncedState } from "hamo"
import { features } from "../../../../config/features"

export function TrajectoriesChart() {
  const {
    selectedTrajectoriesIDs,
    trajectoriesSelectionMode,
    setTrajectoriesSelectionMode,
    toggleSelectedTrajectory,
    selectedLumps,
  } = useFilters()
  const { selectedLinks } = useDerivedData()

  const {
    h,
    hoveredTrajectoriesIDs,
    selectedIndex,

    enableScrub,
  } = useCharts()

  const [chartMode, setChartMode] = useState("arc") // lines || lumps || arc
  const [hoveredDistribution, setHoveredDistribution] = useState({ type: "", text: "", state: "" })
  const [showLinesOfSelectedLumps, setShowLinesOfSelectedLumps] = useState(false)
  const [showStateDensity, setShowStateDensity] = useState(false)
  const [lineChartMode, setLineChartMode] = useState("duration") // "duration" | "source" | "target"
  const [hoveredLump, setHoveredLump] = useDebouncedState(null, 250)

  const showDistributions = true

  const svgRef = useRef(null)

  const isArrowLeft = useModifierKey("ArrowLeft")
  const isArrowRight = useModifierKey("ArrowRight")
  const isEnter = useModifierKey("Enter")

  useEffect(() => {
    isEnter &&
      hoveredTrajectoriesIDs.length > 0 &&
      toggleSelectedTrajectory(hoveredTrajectoriesIDs[selectedIndex])
  }, [isEnter])

  // useEffect(() => {
  //   if (selectedLinks.length > 500) setChartMode(false)
  // }, [selectedLinks.length])

  const chartButtons = [
    {
      name: "Arc",
      value: "arc",
      keystroke: "a",
      tooltip: "Direction of Source and Target pairs",
      disabled: false,
    },
    {
      name: "Lumps",
      value: "lumps",
      keystroke: "l",
      tooltip: "Clusters of Trajectories",
      disabled: false,
    },
    {
      name: "Lines",
      value: "lines",
      keystroke: null,
      tooltip: "Individual Trajectories",
      disabled: selectedLinks.length > 500,
    },
  ]

  const linesControlButtons = [
    {
      name: "||",
      value: "vertical",
      keystroke: null,
      tooltip: "Transitions that happen at the same moment in time",
    },
    { name: "All", value: "all", keystroke: null, tooltip: "All trajectories" },
    {
      name: "\\\\",
      value: "diagonal",
      keystroke: null,
      tooltip: "Transitions that happen in different moments",
    },
  ]

  return (
    <>
      <div className="chart-controls">
        <div id="lump-controls" className={` ${chartMode}`}>
          <div>
            {chartButtons.map((b) => (
              <Button
                key={b.name}
                data-selected={chartMode === b.value}
                size="xs"
                keystroke={b.keystroke ?? ""}
                onClick={() => setChartMode(b.value)}
                tooltip={b.tooltip}
                disabled={b.disabled}
              >
                {b.keystroke ? (
                  <>
                    <ShortcutSpan>{b.name[0]}</ShortcutSpan>
                    {b.name.slice(1)}
                  </>
                ) : (
                  <>{b.name}</>
                )}
              </Button>
            ))}
          </div>
        </div>

        <div id="line-controls">
          {chartMode === "lumps" && selectedLumps.length > 0 && (
            <div>
              <Button
                size="xs"
                data-selected={showLinesOfSelectedLumps}
                onClick={() => setShowLinesOfSelectedLumps(!showLinesOfSelectedLumps)}
                tooltip="Show the segments within the selected lumps"
              >
                {showLinesOfSelectedLumps ? "Hide" : "Show"}
              </Button>
            </div>
          )}
          {(chartMode === "lines" || showLinesOfSelectedLumps) && (
            <div>
              {linesControlButtons.map((b) => (
                <Button
                  key={b.name}
                  data-selected={trajectoriesSelectionMode === b.value}
                  size="xs"
                  keystroke={b.keystroke ?? ""}
                  onClick={() => setTrajectoriesSelectionMode(b.value)}
                  tooltip={b.tooltip}
                >
                  {b.keystroke ? (
                    <>
                      <ShortcutSpan>{b.name[0]}</ShortcutSpan>
                      {b.name.slice(1)}
                    </>
                  ) : (
                    <>{b.name}</>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div id="scrub-panel">
          <AnimatePresence>
            {enableScrub && hoveredTrajectoriesIDs.length > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span>
                  {selectedIndex + 1}/{hoveredTrajectoriesIDs.length}
                </span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div id="density-control">
          <Button
            size="xs"
            data-selected={showStateDensity}
            onClick={() => setShowStateDensity(!showStateDensity)}
            tooltip={"Toggle Segment Density by State"}
          >
            <ChartLine size={12} />
            {/* <span class="material-icons">ssid_chart</span> */}
          </Button>
        </div>

        {features.matrix && (
          <div id="matrix-controls">
            <ListFilter size={16} />
            <select value={lineChartMode} onChange={(e) => setLineChartMode(e.target.value)}>
              <option value="duration">Duration</option>
              <option value="sourceD">Source</option>
              <option value="targetD">Target</option>
              <option value="sourceAge">Source Age</option>
              <option value="targetAge">Target Age</option>
            </select>
          </div>
        )}
      </div>

      <div className="chart-container">
        {showDistributions && (
          <div className="svg-container" id="distributions-chart">
            <svg preserveAspectRatio="xMidYMid meet" viewBox={`0 0 70 ${h}`}>
              <StateTypeDistribution setHoveredDistribution={setHoveredDistribution} />
            </svg>
          </div>
        )}
        <div id="trajectories-chart" className="svg-container">
          <div style={{ position: "relative" }}>
            <svg ref={svgRef} preserveAspectRatio="xMidYMid meet" viewBox={`0 0 210 ${h}`}>
              <TextureDefs />
              <GradientDefs />

              <Grid chartMode={chartMode} />
              <AnimatePresence mode="wait">
                {chartMode !== "arc" && (
                  <g>
                    <Lumps
                      //Extended Context
                      isSelectModeLines={chartMode === "lines"}
                      showLinesOfSelectedLumps={showLinesOfSelectedLumps}
                      //Local State
                      hoveredLump={hoveredLump}
                      setHoveredLump={setHoveredLump}
                      svgRef={svgRef}
                    />

                    {selectedLinks.length < 500 && (
                      <TrajectoriesMotion
                        //Extended Context
                        isSelectModeLines={chartMode === "lines"}
                        //Local State
                        showLinesOfSelectedLumps={showLinesOfSelectedLumps}
                      />
                    )}
                    {showStateDensity && <StateDensity hoveredDistribution={hoveredDistribution} />}
                  </g>
                )}
                {chartMode === "arc" && <ArcChart />}
              </AnimatePresence>
            </svg>
          </div>
          <Tooltip isVisible={enableScrub && hoveredTrajectoriesIDs.length > 0}>
            <HoveredTrajectoryPopUp
              selectedIndex={selectedIndex}
              isArrowLeft={isArrowLeft}
              isArrowRight={isArrowRight}
              hoveredTrajectoriesIDs={hoveredTrajectoriesIDs}
              selectedTrajectoriesIDs={selectedTrajectoriesIDs}
            />
          </Tooltip>

          <Tooltip isVisible={hoveredDistribution.type !== ""}>
            <p>{hoveredDistribution.text}</p>
          </Tooltip>
        </div>
        {/* <Legend /> */}
        {features.matrix && <StatesMatrix width={h} height={h} lineChartMode={lineChartMode} />}
      </div>
    </>
  )
}

const HoveredTrajectoryPopUp = ({
  selectedIndex,
  isArrowLeft,
  isArrowRight,
  hoveredTrajectoriesIDs,
  selectedTrajectoriesIDs,
}) => {
  const isSelected = selectedTrajectoriesIDs.includes(hoveredTrajectoriesIDs[selectedIndex])
  return (
    <motion.div className="hovered-trajectory-pop-up">
      {selectedIndex > 0 && (
        <motion.p
          className="arrow-left"
          animate={{
            scale: isArrowLeft ? 0.8 : 1,
          }}
        >
          {"<"}
        </motion.p>
      )}
      <motion.p
        key={`label-${hoveredTrajectoriesIDs[selectedIndex]}`}
        initial={{ opacity: 0, x: (-isArrowLeft + isArrowRight) * 10 }}
        animate={{
          opacity: 1,
          x: 0,
          fontWeight: isSelected ? 700 : 500,
          // color: isSelected ? "var(--surface-accent)" : "var(--surface-contrast)",
        }}
        exit={{ opacity: 0, x: (-isArrowLeft + isArrowRight) * 10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {hoveredTrajectoriesIDs[selectedIndex]}
      </motion.p>
      {hoveredTrajectoriesIDs.length > 1 && selectedIndex < hoveredTrajectoriesIDs.length - 1 && (
        <motion.p className="arrow-right" animate={{ scale: isArrowRight ? 0.5 : 1 }}>
          {">"}
        </motion.p>
      )}
    </motion.div>
  )
}
