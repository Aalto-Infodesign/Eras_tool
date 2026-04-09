import { CarouselWrapper } from "../../common/Carousel/Carousel"
import { SilhouettesPie } from "../silhouettes/SilhouettesPie"
import { DebugPanel } from "../helper-panels/DebugPanel"
import { DataPanel } from "../helper-panels/DataPanel"
import { ExportIDs } from "../export/ExportIDs"

import { motion } from "motion/react"

import { features } from "../../../config/features"

export const Carousel = () => {
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
    <motion.section
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
          <SilhouettesPie />
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
  )
}
