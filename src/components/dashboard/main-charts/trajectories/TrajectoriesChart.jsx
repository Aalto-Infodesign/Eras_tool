import { useState, useRef, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useCharts } from "../ChartsContext"

import { StateTypeDistribution } from "./StatesTypeDistribution"
import { Grid } from "./Grid"

import { TrajectoriesMotion } from "./TrajectoriesMotion"
import { StateDensity } from "./density/StateDensity"
import { StackedStateDensity } from "./density/StackedStateDensity"
import { Tooltip } from "../../../common/Tooltip/Tooltip"

import { Lumps } from "./Lumps"

import { TextureDefs } from "../../../common/defs/Textures/TextureDefs"

import { useModifierKey } from "../../../hooks/useModifierKey"

import { useFilters } from "../../../../contexts/FiltersContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import Button from "../../../common/Button/Button"
import { StatesMatrix } from "../../../fileLoader/statesMatrix/StatesMatrix"
import { ChartLine, Layers, ListFilter } from "lucide-react"
import { ShortcutSpan } from "../../../common/ShortcutSpan/ShortcutSpan"
import { ArcChart } from "../arc-chart/ArcChart"
import { GradientDefs } from "../../../common/defs/Gradients/GradientDefs"
import { useDebouncedState } from "hamo"
import { features } from "../../../../config/features"
import { StateLabels } from "./StateLabels"
import { ClusteringView } from "../../../clustering/ClusteringView"
import { ProgressiveLegend } from "../../progressive-legend/ProgressiveLegend"
import { StorySpotlight } from "../../progressive-legend/StorySpotlight"
import { useMartiniStory, STEP } from "../../progressive-legend/useMartiniStory"

export function TrajectoriesChart() {
  const {
    selectedTrajectoriesIDs,
    trajectoriesSelectionMode,
    setTrajectoriesSelectionMode,
    toggleSelectedTrajectory,
    selectedLumps,
  } = useFilters()
  const { selectedLinks } = useDerivedData()

  const { h, hoveredTrajectoriesIDs, selectedIndex, enableScrub, chartHeight, measureChartRef } =
    useCharts()

  const [chartMode, setChartMode] = useState("lines") // lines || lumps || arc
  const [sideInfo, setSideInfo] = useState("legend") // cluster || matrix || legend
  const [hoveredDistribution, setHoveredDistribution] = useState({ type: "", text: "", state: "" })
  const [showLinesOfSelectedLumps, setShowLinesOfSelectedLumps] = useState(false)
  const [showStateDensity, setShowStateDensity] = useState(false)
  const [showStackedStateDensity, setShowStackedStateDensity] = useState(false)
  const [lineChartMode, setLineChartMode] = useState("duration") // "duration" | "source" | "target"
  const [hoveredLump, setHoveredLump] = useDebouncedState(null, 250)

  // Martini-glass intro: gates when each chart layer mounts while clustering
  // streams in. With the story off or finished, show() is always true.
  const { step, show, skip, goToStep, next, canAdvance, exemplar } = useMartiniStory()

  const showDistributions = true

  const svgRef = useRef(null)

  // The trajectories SVG is the height "driver": measureChartRef observes it and
  // publishes its rendered height as `chartHeight`. Merge that observer with the
  // existing svgRef (used by Lumps) on the same node.
  const setTrajectoriesSvgRef = useCallback(
    (node) => {
      svgRef.current = node
      measureChartRef(node)
    },
    [measureChartRef],
  )

  // Followers pin to the driver's measured height with width:auto, so height is
  // the sole scaling axis and their state rows line up with the trajectories'.
  // Before the first measurement, fall back to the CSS (width-driven) sizing.
  const followerSizeStyle = chartHeight ? { height: chartHeight, width: "auto" } : undefined

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
      disabled: false,
      // disabled: selectedLinks.length > 500,
    },
  ]
  const sideButtons = [
    {
      name: "Cluster",
      value: "cluster",
      keystroke: "",
      tooltip: "",
      disabled: false,
    },
    {
      name: "Matrix",
      value: "matrix",
      keystroke: "",
      tooltip: "",
      disabled: false,
    },
    {
      name: "Legend",
      value: "legend",
      keystroke: null,
      tooltip: "",
      disabled: false,
      // disabled: selectedLinks.length > 500,
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
        <div id="lump-controls" className={`buttons-wrapper  ${chartMode}`}>
          {chartButtons.map((b) => (
            <Button
              key={b.name}
              data-selected={chartMode === b.value}
              size="xs"
              keystroke={b.keystroke ?? ""}
              onClick={() => setChartMode(b.value)}
              tooltip={b.tooltip}
              tooltipPosition="bottom-right"
              disabled={b.disabled}
            >
              <p>
                {b.keystroke ? (
                  <>
                    <ShortcutSpan>{b.name[0]}</ShortcutSpan>
                    {b.name.slice(1)}
                  </>
                ) : (
                  <>{b.name}</>
                )}
              </p>
            </Button>
          ))}
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
            <div className="buttons-wrapper">
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

        <div id="density-control" className="buttons-wrapper">
          {/* <Button
            size="xs"
            data-selected={showStateDensity}
            onClick={() => {
              setShowStateDensity(!showStateDensity)
              setShowStackedStateDensity(false)
            }}
            tooltip={"Toggle Segment Density by State"}
          >
            <ChartLine size={12} />
          </Button> */}
          <Button
            size="xs"
            data-selected={showStackedStateDensity}
            onClick={() => {
              setShowStackedStateDensity(!showStackedStateDensity)
              setShowStateDensity(false)
            }}
            tooltip={"Toggle Stacked Cluster Density by State"}
          >
            <ChartLine size={12} />

            {/* <Layers size={12} /> */}
          </Button>
        </div>

        <div>
          <div className="buttons-wrapper">
            {sideButtons.map((b) => (
              <Button
                key={b.name}
                data-selected={sideInfo === b.value}
                size="xs"
                keystroke={b.keystroke ?? ""}
                onClick={() => setSideInfo(b.value)}
                tooltip={b.tooltip}
                disabled={b.disabled}
              >
                <p>
                  {b.keystroke ? (
                    <>
                      <ShortcutSpan>{b.name[0]}</ShortcutSpan>
                      {b.name.slice(1)}
                    </>
                  ) : (
                    <>{b.name}</>
                  )}
                </p>
              </Button>
            ))}
          </div>

          {features.matrix && sideInfo === "matrix" && (
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
      </div>

      <div className="chart-container">
        {showDistributions && (
          <div className="svg-container" id="distributions-chart">
            <svg preserveAspectRatio="xMidYMid meet" viewBox={`0 0 70 ${h}`} style={followerSizeStyle}>
              <StateTypeDistribution setHoveredDistribution={setHoveredDistribution} />
            </svg>
          </div>
        )}

        <div className="svg-container" id="state-labels">
          <svg
            id="state-labels"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`0 0 35 ${h}`}
            style={followerSizeStyle}
          >
            <StateLabels />
          </svg>
        </div>

        <div id="trajectories-chart" className="svg-container">
          <div style={{ position: "relative" }}>
            <svg
              id="trajectories-chart-svg"
              ref={setTrajectoriesSvgRef}
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 0 175 ${h}`}
            >
              <TextureDefs />
              <GradientDefs />
              {show(STEP.STATES) && <Grid chartMode={chartMode} />}
              <AnimatePresence mode="wait">
                {chartMode !== "arc" && (
                  <g>
                    {show(STEP.BOXPLOTS) && (
                      <Lumps
                        //Extended Context
                        isSelectModeLines={chartMode === "lines"}
                        showLinesOfSelectedLumps={showLinesOfSelectedLumps}
                        //Local State
                        hoveredLump={hoveredLump}
                        setHoveredLump={setHoveredLump}
                        svgRef={svgRef}
                      />
                    )}

                    {show(STEP.SILHOUETTE) && (
                      <TrajectoriesMotion
                        //Extended Context
                        isSelectModeLines={chartMode === "lines"}
                        //Local State
                        showLinesOfSelectedLumps={showLinesOfSelectedLumps}
                      />
                    )}

                    <StorySpotlight step={step} exemplar={exemplar} />
                    {/* {showStateDensity && <StateDensity />} */}
                    {showStackedStateDensity && <StackedStateDensity />}
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
        <div id="side-info">
          {/* {sideInfo === "legend" && <Legend />} */}
          {features.matrix && sideInfo === "matrix" && (
            <StatesMatrix width={h} height={h} lineChartMode={lineChartMode} />
          )}
          {sideInfo === "cluster" && <ClusteringView />}
          {sideInfo === "legend" && (
            <ProgressiveLegend
              step={step}
              onSkip={skip}
              onSelectStep={goToStep}
              onNext={next}
              canAdvance={canAdvance}
              exemplar={exemplar}
            />
          )}
        </div>
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
