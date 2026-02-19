import { useState, useEffect, useMemo } from "react"
import { includes, union } from "lodash"
import { TrajectoriesExplorerChart } from "./dashboard/ExplorerChart"
import { SilhouettesMorph } from "./dashboard/silhouettes/SilhouettesMorph"
import { CarouselWrapper } from "./common/Carousel/Carousel"
import { SilhouettesPie } from "./dashboard/silhouettes/SilhouettesPie"
import { DebugPanel } from "./dashboard/debug/DebugPanel"
import {
  motion,
  useAnimate,
  stagger,
  usePresence,
  LayoutGroup,
  AnimatePresence,
} from "motion/react"
import { useModifierKey } from "./hooks/useModifierKey"
import { ExportIDs } from "./dashboard/export/ExportIDs"

import { useData } from "../contexts/ProcessedDataContext"
import { useViz } from "../contexts/VizContext"
import { useDerivedData } from "../contexts/DerivedDataContext"
import { useFilters } from "../contexts/FiltersContext"
import { Filters } from "./dashboard/filters/Filters"
import { Command } from "lucide-react"

// import Umap from "./dashboard/umap"
const Dashboard = () => {
  const w = 170
  const marginTop = 10

  const { richData, analytics, silhouettes, idealSilhouettes } = useData()
  const { statesOrder } = useViz()
  const { filters } = useFilters()
  const { completeSilhouettes } = useDerivedData()

  //For File Loader
  const minHeight = 100
  let stateIncrement = 0

  if (statesOrder.length > 0 && statesOrder.length < 5) {
    stateIncrement = minHeight / statesOrder.length
  } else if (statesOrder.length >= 5 && statesOrder.length <= 10) {
    stateIncrement = 20
  } else if (statesOrder.length > 10) {
    stateIncrement = 15
  }

  // const h = document.querySelector(".chart-container").
  const h = statesOrder.length * stateIncrement

  // TODO Seleziona soloe Silh esistenti davvero
  // ?? Auto-select silhouettes based on initial FLow?
  const [selectedSilhouettes, setSelectedSilhouettes] = useState(idealSilhouettes) // Main filter
  const [selectedTrajectoriesIDs, setSelectedTrajectoriesIDs] = useState([])

  const [isHasse, setIsHasse] = useState(false) // false: typologies, true: hasse

  const [chartType, setChartType] = useState(1) // 1: trajectories, 2: partial order

  const toggleSilhouetteFilter = (silhouette) => {
    const silhouettesToToggle = Array.isArray(silhouette) ? silhouette : [silhouette]

    let newFilter

    // 2. Handle single-item toggles (the original behavior)
    if (silhouettesToToggle.length === 1) {
      const item = silhouettesToToggle[0]
      // If the item is already selected, remove it. Otherwise, add it.
      if (selectedSilhouettes.includes(item)) {
        newFilter = selectedSilhouettes.filter((s) => s !== item)
      } else {
        newFilter = [...selectedSilhouettes, item]
      }
    } else {
      // 3. Handle arrays: add all or remove all
      const allAreSelected = silhouettesToToggle.every((s) => selectedSilhouettes.includes(s))

      if (allAreSelected) {
        // If every item is already in the filter, remove them all.
        newFilter = selectedSilhouettes.filter((s) => !silhouettesToToggle.includes(s))
      } else {
        // If one or more items are missing, add all of them (uniquely).
        newFilter = [...new Set([...selectedSilhouettes, ...silhouettesToToggle])]
      }
    }

    setSelectedSilhouettes(newFilter)
  }

  const [isPresent, safeToRemove] = usePresence()
  const [scope, animate] = useAnimate()

  useEffect(() => {
    if (isPresent) {
      const enterAnimation = async () => {
        await animate(scope.current, { opacity: 1 })
        await animate(
          ".bento-item",
          { opacity: 1, y: 0 },
          { duration: 0.8, delay: stagger(0.15), ease: "easeOut" },
        )
      }
      enterAnimation()
    } else {
      const exitAnimation = async () => {
        await animate(
          ".bento-item",
          { opacity: 0, y: 16 },
          { duration: 0.5, delay: stagger(0.15), ease: "easeOut" },
        )
        await animate(scope.current, { opacity: 0 })
        safeToRemove()
      }

      exitAnimation()
    }
  }, [richData, isPresent, animate, safeToRemove, scope])

  const isCmdPressed = useModifierKey("Meta")

  console.log(completeSilhouettes)

  const selectedSilhouettesData = completeSilhouettes.filter((s) =>
    includes(selectedSilhouettes, s.name),
  )

  console.log(selectedSilhouettesData)

  // TODO: come creo logica inclusiva o esclusiva tra silhouettes e trajectories?
  const selectedIDs = useMemo(() => {
    // 1. Clean up the Silhouette IDs (Ensure we have a flat array of unique IDs)
    const IDsFromSilhouettes = selectedSilhouettesData
      .flatMap((s) => (s.isFiltered ? s.filtered.trajectories : s.trajectories)) // Modern alternative to .map().flat()
      .map((t) => t[0]?.id) // Use optional chaining to prevent crashes
      .filter(Boolean) // Remove any undefined/null values

    console.log(IDsFromSilhouettes)
    console.log(selectedTrajectoriesIDs)

    const IDsFromTrajectories = selectedTrajectoriesIDs || []
    const type = Number(chartType)

    // If chartType is 1 (trajectories), combine both silhouette and trajectory selections
    // If chartType is 2 (partial order), use only trajectory selections

    if (type === 1) {
      /** * INCLUSIVE (OR / UNION)
       * Returns everything selected in BOTH silhouettes and trajectories.
       */
      return union(IDsFromSilhouettes, IDsFromTrajectories)
    }

    if (type === 2 && IDsFromTrajectories.length > 0) {
      /** * EXCLUSIVE (AND / INTERSECTION)
       * Returns only IDs that appear in BOTH categories.
       */
      return [...IDsFromTrajectories]
    }

    // Default fallback (e.g., just Silhouettes)
    return [...IDsFromSilhouettes]
  }, [selectedSilhouettesData, selectedTrajectoriesIDs, chartType])
  // console.log("Rendering Ids:", selectedIDs)

  const boxVariants = {
    visible: {
      opacity: 1,
      // scale: 1,
      // filter: "blur(0px)",
      x: 0,
      transition: { ease: "easeInOut", when: "beforeChildren", delay: 0.5 },
    },
    hidden: {
      opacity: 0,
      // scale: 0.8,
      // filter: "blur(4px)",
      x: -10,

      // transition: { ease: "easeInOut", when: "beforeChildren" },
    },
  }

  const MOTION_TREHSHOLD = 25000

  const reduceMotion = useMemo(() => richData.length > MOTION_TREHSHOLD, [richData.length])

  //debug function that prints count of all the elements containd in svgs
  const countSvgElements = () => {
    const svgs = document.querySelectorAll("svg")
    let count = 0
    svgs.forEach((svg) => {
      count += svg.querySelectorAll("*").length
    })
    // console.log("Total SVG elements:", count)
  }
  useEffect(() => {
    countSvgElements()
  }, [completeSilhouettes, isCmdPressed])

  return (
    <motion.main
      ref={scope}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      layout
      className="bento-container"
    >
      <LayoutGroup>
        <AnimatePresence>
          {isCmdPressed && (
            <motion.div className="key-pop-up">
              <Command size={16} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout className="top-row">
          <AnimatePresence mode="popLayout">
            {selectedSilhouettesData && !isHasse && (
              <motion.section
                key={"carousel"}
                layout
                layoutId={"carousel"}
                variants={boxVariants}
                initial={"hidden"}
                animate={"visible"}
                exit={"hidden"}
                className="bento-item carousel"
              >
                <CarouselWrapper>
                  <div className="carousel-slides-content" data-title="Silhouettes selected">
                    <SilhouettesPie selectedSilhouettesData={selectedSilhouettesData} />
                  </div>
                  <div className="carousel-slides-content" data-title="Analytics">
                    <h4>Datapoints</h4>
                    <p>
                      {selectedIDs.length > 0 && <span>{selectedIDs.length} / </span>}
                      {analytics.datapoints}
                    </p>
                    <h4>Silhouettes</h4>
                    <p>
                      {selectedSilhouettesData.length > 0 && (
                        <span>{selectedSilhouettesData.length} / </span>
                      )}
                      {silhouettes.length}
                    </p>
                    <h4>Age Range</h4>
                    <p>
                      {Math.round(analytics.ageRange[0])} - {Math.round(analytics.ageRange[1])}
                    </p>
                    <h4>Date Range</h4>
                    <p>
                      {Math.round(analytics.dateRange[0])} - {Math.round(analytics.dateRange[1])}
                    </p>
                  </div>
                  {/* <div className="carousel-slides-content" data-title="Debug Tools">
                    <DebugPanel />
                  </div> */}
                  <div className="carousel-slides-content" data-title="Export">
                    <ExportIDs selectedIDs={selectedIDs} />
                  </div>
                </CarouselWrapper>
              </motion.section>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {silhouettes && (
              <SilhouettesMorph
                toggleSilhouetteFilter={toggleSilhouetteFilter}
                setSelectedSilhouettes={setSelectedSilhouettes}
                selectedSilhouettes={selectedSilhouettes}
                isHasse={isHasse}
                setIsHasse={setIsHasse}
              />
            )}
          </AnimatePresence>
        </motion.div>

        <TrajectoriesExplorerChart
          w={w}
          h={h}
          marginTop={marginTop}
          selectedSilhouettes={selectedSilhouettes}
          toggleSilhouetteFilter={toggleSilhouetteFilter}
          selectedTrajectoriesIDs={selectedTrajectoriesIDs}
          setSelectedTrajectoriesIDs={setSelectedTrajectoriesIDs}
          chartType={chartType}
          setChartType={setChartType}
          // Other stuff
          reduceMotion={reduceMotion}
        />

        {filters && <Filters />}

        {/* <StatesDendrogram
            marginTop={marginTop}
            palette={palette}
            silhouettes={silhouettes}
            toggleSilhouetteFilter={toggleSilhouetteFilter}
            selectedSilhouettes={selectedSilhouettes}
          /> */}
      </LayoutGroup>
    </motion.main>
  )
}

export default Dashboard
