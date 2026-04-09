import { useEffect } from "react"
import { SilhouettesMorph } from "./dashboard/silhouettes/SilhouettesMorph"
import { CarouselWrapper } from "./common/Carousel/Carousel"
import { SilhouettesPie } from "./dashboard/silhouettes/SilhouettesPie"
import { DebugPanel } from "./dashboard/helper-panels/DebugPanel"
import {
  motion,
  useAnimate,
  stagger,
  usePresence,
  LayoutGroup,
  AnimatePresence,
} from "motion/react"

import { ExportIDs } from "./dashboard/export/ExportIDs"

import { useData } from "../contexts/ProcessedDataContext"
import { useViz } from "../contexts/VizContext"
import { useDerivedData } from "../contexts/DerivedDataContext"
import { DataPanel } from "./dashboard/helper-panels/DataPanel"
import { ChartsContainer } from "./dashboard/main-charts/ChartsContainer"
import { SelectionPanel } from "./dashboard/selection-panel/SelectionPanel"
import { features } from "../config/features"

// import Umap from "./dashboard/umap"
const Dashboard = () => {
  const { isHasse, isLegend } = useViz()
  const { selectedSilhouettesData } = useDerivedData()

  const [isPresent, safeToRemove] = usePresence()
  const [scope, animate] = useAnimate()

  useEffect(() => {
    if (isPresent && isLegend) {
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
  }, [isLegend, isPresent, animate, safeToRemove, scope])

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
                  <div className="carousel-slides-content" data-title="Analytics ">
                    <DataPanel />
                  </div>
                  <div className="carousel-slides-content" data-title="Silhouettes selected">
                    <SilhouettesPie selectedSilhouettesData={selectedSilhouettesData} />
                  </div>
                  {features.debugPanel && (
                    <div className="carousel-slides-content" data-title="Debug Tools">
                      <DebugPanel />
                    </div>
                  )}
                  <div className="carousel-slides-content" data-title="Export">
                    <ExportIDs />
                  </div>
                </CarouselWrapper>
              </motion.section>
            )}
            {features.silhouettes && <SilhouettesMorph />}
          </AnimatePresence>
        </motion.div>

        <ChartsContainer />
        <SelectionPanel />
      </LayoutGroup>
    </motion.main>
  )
}

export default Dashboard
