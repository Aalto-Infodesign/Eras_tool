import { useEffect, useMemo } from "react"
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
import { Command } from "lucide-react"
import { useSilhouettesPoset } from "./dashboard/silhouettes/hooks/usePosetLayout"

// import Umap from "./dashboard/umap"
const Dashboard = () => {
  const { richData, analytics, silhouettes } = useData()
  const { statesOrder, isHasse } = useViz()
  const { completeSilhouettes, selectedSilhouettesData, selectedIDs } = useDerivedData()

  const w = 170
  const marginTop = 10
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

  const [isPresent, safeToRemove] = usePresence()
  const [scope, animate] = useAnimate()

  const isCmdPressed = useModifierKey("Meta")

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
                  <div className="carousel-slides-content" data-title="Debug Tools">
                    <DebugPanel />
                  </div>
                  <div className="carousel-slides-content" data-title="Export">
                    <ExportIDs />
                  </div>
                </CarouselWrapper>
              </motion.section>
            )}
          </AnimatePresence>
          <AnimatePresence>{silhouettes && <SilhouettesMorph />}</AnimatePresence>
        </motion.div>

        <TrajectoriesExplorerChart
          w={w}
          h={h}
          marginTop={marginTop}
          // Other stuff
          reduceMotion={reduceMotion}
        />
      </LayoutGroup>
    </motion.main>
  )
}

export default Dashboard
