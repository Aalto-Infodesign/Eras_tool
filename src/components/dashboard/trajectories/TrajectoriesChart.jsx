import { useContext, useState, useRef, useEffect, useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { StateTypeDistribution } from "./StatesTypeDistribution"
import { Grid } from "./Grid"
// import { TrajectoriesLumped } from "./TrajectoriesLumped"

import { TrajectoriesMotion } from "./TrajectoriesMotion"
// import { Trajectories } from "./Trajectories"
import { StateDensity } from "./StateDensity"
import { Tooltip } from "../../common/Tooltip/Tooltip"

import { Lumps } from "./Lumps"

import { flattenDeep, groupBy, mapValues, values, merge, unionBy, sortBy } from "lodash"

import { TextureDefs } from "../../common/Textures/TextureDefs"

import { useModifierKey } from "../../hooks/useModifierKey"

export function TrajectoriesChart({}) {
  const i = performance.now()
  const trajectoriesContext = useContext(TrajectoriesContext)

  const {
    h,
    completeLinks,
    filteredLinks,
    silhouettes,
    filteredSilhouettes,
    setStatesOrder,
    statesNamesLoaded,
    hoveredTrajectoriesIDs,
    selectedIndex,
    scales,
    palette,
    selectedLumps,
    toggleSelectedTrajectory,
    selectedTrajectoriesIDs,
  } = trajectoriesContext

  const [isSelectModeLines, setIsSelectModeLines] = useState(false)
  const [hoveredDistribution, setHoveredDistribution] = useState({ type: "", text: "", state: "" })
  const [hoveredStateLabel, setHoveredStateLabel] = useState()
  const [showLinesOfSelectedLumps, setShowLinesOfSelectedLumps] = useState(false)
  const [showStateDensity, setShowStateDensity] = useState(false)
  // const [showDistributions, setShowDistributions] = useState(true)

  const showDistributions = true
  const [hoveredLump, setHoveredLump] = useState({})

  const svgRef = useRef(null)

  const isArrowLeft = useModifierKey("ArrowLeft")
  const isArrowRight = useModifierKey("ArrowRight")
  const isEnter = useModifierKey("Enter")

  const processedData = useMemo(() => {
    const linksBySourceState = groupBy(completeLinks, "source.state")
    const linksByTargetState = groupBy(completeLinks, "target.state")
    const filteredLinksBySourceState = groupBy(filteredLinks, "source.state")
    const filteredLinksByTargetState = groupBy(filteredLinks, "target.state")

    const initialAndFinalOGPerStateSource = getInitialAndFinalOGPerState(linksBySourceState)
    const initialAndFinalOGPerStateTarget = getInitialAndFinalOGPerState(linksByTargetState)

    const initialAndFinalCompletePerStateSource = getInitialAndFinalPerState(linksBySourceState)
    const initialAndFinalCompletePerStateTarget = getInitialAndFinalPerState(linksByTargetState)

    const initialAndFinalPerStateSource = getInitialAndFinalPerState(filteredLinksBySourceState)
    const initialAndFinalPerStateTarget = getInitialAndFinalPerState(filteredLinksByTargetState)

    const unitedObjectsOriginal = unionBy(
      initialAndFinalOGPerStateSource,
      initialAndFinalOGPerStateTarget,
      "state",
    )

    const unitedObjects = unionBy(
      initialAndFinalPerStateSource,
      initialAndFinalPerStateTarget,
      "state",
    )

    const groupedObjectsByState = groupBy([...unitedObjects, ...unitedObjectsOriginal], "state")

    const mergedObjectsByState = Object.entries(groupedObjectsByState).map(([state, objects]) => {
      return objects.reduce((result, obj) => merge(result, obj), {})
    })

    return {
      unitedObjectsOriginal,
      mergedObjectsByState,
      initialAndFinalCompletePerStateSource,
      initialAndFinalCompletePerStateTarget,
    }
  }, [filteredLinks, completeLinks])

  const allTrajectories = useMemo(
    () => flattenDeep(silhouettes.map((s) => s.trajectories)),
    [silhouettes],
  )

  useEffect(() => {
    isEnter &&
      hoveredTrajectoriesIDs.length > 0 &&
      toggleSelectedTrajectory(hoveredTrajectoriesIDs[selectedIndex])
  }, [isEnter])

  const f = performance.now()
  console.log("TrajectoriesChart render time:", f - i, "ms")

  return (
    <>
      <div className="controls">
        <div className={`lump-controls ${isSelectModeLines ? "Lines" : "Lumps"}`}>
          {filteredLinks.length < 500 && (
            <button
              className={` ${isSelectModeLines ? "" : "selected"}`}
              onClick={() => setIsSelectModeLines(!isSelectModeLines)}
              title="Toggle from Lumps to lines"
            >
              {isSelectModeLines ? "Lumps" : "Lines"}
            </button>
          )}

          {!isSelectModeLines && selectedLumps.length > 0 && (
            <button
              className={` ${showLinesOfSelectedLumps ? "selected" : ""}`}
              onClick={() => setShowLinesOfSelectedLumps(!showLinesOfSelectedLumps)}
              title="When lumps are selected, show the lines"
            >
              {showLinesOfSelectedLumps ? "Hide" : "Show"}
            </button>
          )}
        </div>

        <AnimatePresence>
          {hoveredTrajectoriesIDs.length > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span>
                {selectedIndex + 1}/{hoveredTrajectoriesIDs.length}
              </span>
            </motion.p>
          )}
        </AnimatePresence>

        <div className="controls">
          {/* <div className="distribution-control">
                    <button
                      className={` ${showDistributions ? "selected" : ""}`}
                      onClick={() => setShowDistributions(!showDistributions)}
                    >
                      {`${showDistributions ? "Hide" : "Show"} distributions`}
                    </button>
                  </div> */}
          <div className="density-control">
            <button
              className={` ${showStateDensity ? "selected" : ""}`}
              onClick={() => setShowStateDensity(!showStateDensity)}
            >
              {`${showStateDensity ? "Hide" : "Show"} density`}
              {/* <span class="material-icons">ssid_chart</span> */}
            </button>
          </div>
        </div>
      </div>

      <div className="chart-container">
        {showDistributions && (
          <div className="svg-container">
            <svg id="distributionsSvg" preserveAspectRatio="xMidYMid meet" viewBox={`0 0 70 ${h}`}>
              <StateTypeDistribution
                setHoveredDistribution={setHoveredDistribution}
                unitedObjectsOriginal={processedData.unitedObjectsOriginal}
                mergedObjectsByState={processedData.mergedObjectsByState}
                initialAndFinalCompletePerStateSource={
                  processedData.initialAndFinalCompletePerStateSource
                }
                initialAndFinalCompletePerStateTarget={
                  processedData.initialAndFinalCompletePerStateTarget
                }
              />
            </svg>
          </div>
        )}
        <div className="svg-container">
          <svg
            ref={svgRef}
            id="trajectoriesChartSvg"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`0 0 210 ${h}`}
          >
            <TextureDefs />
            <GradientDefs statesNamesLoaded={statesNamesLoaded} palette={palette} />

            <Grid
              isSelectModeLines={isSelectModeLines}
              statesNamesLoaded={statesNamesLoaded}
              allTrajectories={allTrajectories}
              setStatesOrder={setStatesOrder}
              setHoveredStateLabel={setHoveredStateLabel}
            />

            <Lumps
              //Extended Context
              isSelectModeLines={isSelectModeLines}
              //Local State
              filteredSilhouettes={filteredSilhouettes}
              hoveredLump={hoveredLump}
              setHoveredLump={setHoveredLump}
              svgRef={svgRef}
            />

            <TrajectoriesMotion
              //Extended Context
              isSelectModeLines={isSelectModeLines}
              //Local State
              showLinesOfSelectedLumps={showLinesOfSelectedLumps}
            />

            {showStateDensity && (
              <StateDensity
                //Extended Context
                filteredLinks={filteredLinks}
                //Local State
                unitedObjectsOriginal={processedData.unitedObjectsOriginal}
                mergedObjectsByState={processedData.mergedObjectsByState}
                hoveredDistribution={hoveredDistribution}
              />
            )}
          </svg>
          <Tooltip isVisible={hoveredTrajectoriesIDs.length > 0}>
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
          <Tooltip isVisible={hoveredStateLabel}>
            <p>{hoveredStateLabel}</p>
          </Tooltip>
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

// Create gradient definitions based on the statesNamesLoaded order
function GradientDefs({ statesNamesLoaded, palette }) {
  // Get the state positions based on their order
  const statePositions = {}
  statesNamesLoaded.forEach((state, index) => {
    statePositions[state] = index
  })

  // Generate all necessary gradient data
  const gradients = []
  // Create gradients for all possible state combinations based on the order
  for (let i = 0; i < statesNamesLoaded.length; i++) {
    for (let j = 0; j < statesNamesLoaded.length; j++) {
      if (i !== j) {
        // Skip creating gradients for the same state
        const sourceState = statesNamesLoaded[i]
        const targetState = statesNamesLoaded[j]

        // Determine gradient direction based on visual position
        const sourcePos = statePositions[sourceState]
        const targetPos = statePositions[targetState]

        // If source is below target (higher index), gradient goes bottom to top
        // If source is above target (lower index), gradient goes top to bottom
        const y1 = sourcePos > targetPos ? "100%" : "0%"
        const y2 = sourcePos > targetPos ? "0%" : "100%"

        gradients.push({
          id: `gradient-${sourceState}-${targetState}`,
          y1,
          y2,
          stops: [
            { offset: "0%", color: palette[sourceState], opacity: 1 },
            { offset: "100%", color: palette[targetState], opacity: 1 },
          ],
        })
      }
    }
  }
  return (
    <defs>
      {gradients.map((grad) => (
        <linearGradient key={grad.id} id={grad.id} x1="0%" y1={grad.y1} x2="0%" y2={grad.y2}>
          {grad.stops.map((stop) => (
            <stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </linearGradient>
      ))}
    </defs>
  )
}

function getInitialAndFinalPerState(linksByState) {
  return sortBy(
    values(
      mapValues(linksByState, (stateItems, stateKey) => ({
        state: stateKey,
        initialState: stateItems.filter((d) => d.initialState && d),
        finalState: stateItems.filter((d) => d.finalState && d),
      })),
    ),
    "state",
  )
}
function getInitialAndFinalOGPerState(linksByState) {
  return sortBy(
    values(
      mapValues(linksByState, (stateItems, stateKey) => ({
        state: stateKey,
        initialStateOG: stateItems.filter((d) => d.initialState && d),
        finalStateOG: stateItems.filter((d) => d.finalState && d),
      })),
    ),
    "state",
  )
}
