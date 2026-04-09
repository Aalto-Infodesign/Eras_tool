import { useEffect } from "react"
import { SilhouettesMorph } from "./dashboard/silhouettes/SilhouettesMorph"

import {
  motion,
  useAnimate,
  stagger,
  usePresence,
  LayoutGroup,
  AnimatePresence,
} from "motion/react"

import { useViz } from "../contexts/VizContext"
import { ChartsContainer } from "./dashboard/main-charts/ChartsContainer"
import { SelectionPanel } from "./dashboard/selection-panel/SelectionPanel"
import { features } from "../config/features"
import { Carousel } from "./dashboard/carousel/Carousel"

// import Umap from "./dashboard/umap"
const Dashboard = () => {
  const { isHasse, isLegend } = useViz()

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
            {features.carousel && !isHasse && (
              <Carousel key={"carousel"} layout layoutId={"carousel"} />
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
