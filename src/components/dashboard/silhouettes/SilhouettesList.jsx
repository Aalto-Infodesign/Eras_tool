import { motion } from "motion/react"
import { Virtuoso } from "react-virtuoso"

import { SilhouetteCard } from "./SilhouetteCard"

const chartVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
}

export function SilhouettesList({
  orderedSilhouettes,
  setHoveredIndex,
  setExpandSides,
  selectedSilhouettesNames,
  resultsBySilhouette,
  animationDuration,
  handleSilhouetteClick,
  handleLongPress,
  handleOrderClick,
  idealSilhouettes,
  percentRange,
}) {
  return (
    <motion.section
      layout
      key="scroller-wrapper"
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="filter-container silhouettes"
    >
      <Virtuoso
        style={{
          height: "150px",
          maxHeight: "150px",
          width: "100%",
          paddingLeft: "10px",
          // paddingBottom: "10px",
          display: "flex",
          alignItems: "end",

          overflowX: "scroll",
          overflowY: "hidden",
        }}
        data={orderedSilhouettes}
        horizontalDirection
        increaseViewportBy={100}
        itemContent={(index, silhouette) => (
          <SilhouetteCard
            silhouette={silhouette}
            index={index}
            setHoveredIndex={setHoveredIndex}
            setExpandSides={setExpandSides}
            selectedSilhouettesNames={selectedSilhouettesNames}
            resultsBySilhouette={resultsBySilhouette}
            animationDuration={animationDuration}
            handleSilhouetteClick={handleSilhouetteClick}
            handleLongPress={handleLongPress}
            handleOrderClick={handleOrderClick}
            idealSilhouettes={idealSilhouettes}
            percentRange={percentRange}
          />
        )}
      />
    </motion.section>
  )
}
