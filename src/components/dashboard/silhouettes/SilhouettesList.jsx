import { motion } from "motion/react"
import { Virtuoso } from "react-virtuoso"

import { SilhouetteCard } from "./SilhouetteCard"

const chartVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
}

export function SilhouettesList({
  orderedSilhouettes,
  hoveredIndex,
  setHoveredIndex,
  setExpandSides,
  selectedSilhouettesNames,
  isCmdPressed,
  expandSides,
  filtersActive,
  resultsBySilhouette,
  animationDuration,
  isHasse,
  handleSilhouetteClick,
  handleExpandClick,
  handleLongPress,
  handleOrderClick,
  idealSilhouettes,
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
        itemContent={(i, s) => (
          <SilhouetteCard
            s={s}
            i={i}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
            setExpandSides={setExpandSides}
            selectedSilhouettesNames={selectedSilhouettesNames}
            isCmdPressed={isCmdPressed}
            expandSides={expandSides}
            filtersActive={filtersActive}
            resultsBySilhouette={resultsBySilhouette}
            animationDuration={animationDuration}
            isHasse={isHasse}
            handleSilhouetteClick={handleSilhouetteClick}
            handleExpandClick={handleExpandClick}
            handleLongPress={handleLongPress}
            handleOrderClick={handleOrderClick}
            idealSilhouettes={idealSilhouettes}
          />
        )}
      />
    </motion.section>
  )
}
