import { motion } from "motion/react"

import { SilhouettePathSvg } from "./shared/SilhouettePathSvg"
import { useLongPressWithProgress } from "../../hooks/useLongPress"
import { useIsTouchDevice } from "../../hooks/useIsTouchDevice"

export function SilhouetteCardMain({
  silhouette,
  index,
  isSelected,
  animationDuration,
  handleSilhouetteClick,
  handleLongPress,
  idealSilhouettes,
}) {
  const isTouchDevice = useIsTouchDevice()

  // On touch devices the long-press hook disambiguates tap vs long-press;
  // on mouse devices selection goes through the plain onClick below.
  const longPressProps = useLongPressWithProgress({
    onLongPress: () => {
      if (isTouchDevice) handleLongPress(silhouette.name)
    },
    onClick: () => {
      if (isTouchDevice) handleSilhouetteClick(silhouette.name)
    },
    threshold: 500,
  })

  const handleCardClick = () => {
    if (!isTouchDevice) handleSilhouetteClick(silhouette.name)
  }

  const typologyVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: animationDuration,
        delay: animationDuration === 0 ? 0 : 1 + index * 0.04,
        ease: "easeInOut",
      },
    }),
    tapped: { scale: 0.96, transition: { duration: 0.2 } },
  }

  const showFilteredValues =
    silhouette.isFiltered && silhouette.percentage !== silhouette.filtered.percentage
  const percentDecimals = showFilteredValues && silhouette.percentage > 1 ? 1 : 2
  const filteredClass = showFilteredValues ? "filtered" : ""

  return (
    <motion.div
      custom={index}
      variants={typologyVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      whileTap="tapped"
      className={`typology ${isSelected ? "selected" : ""}`}
      onClick={handleCardClick}
      {...longPressProps}
    >
      <span className="typology-perc-wrapper">
        <span className={`typology-perc-text ${filteredClass}`}>
          {silhouette.percentage.toFixed(percentDecimals)}%
        </span>

        {showFilteredValues && (
          <span className="typology-perc-text">{silhouette.filtered.percentage.toFixed(2)}%</span>
        )}
      </span>

      <span className="typology-perc-wrapper">
        <span className={`typology-perc-text ${filteredClass}`}>{silhouette.size}</span>

        {showFilteredValues && (
          <span className="typology-perc-text">{silhouette.filtered.size}</span>
        )}
      </span>

      {idealSilhouettes.length > 0 && (
        <span className="typology-perc-text">{silhouette.levenshteinDistance.toFixed(2)}</span>
      )}

      {/* TODO Capire QUAL'é LA BEST MATCH */}
      {silhouette.levenshteinDistance > 0.9 && <span className="top-banner">★</span>}

      <div className="silhouette-wrapper">
        <SilhouettePathSvg
          keyName="card"
          silhouetteName={silhouette.name}
          animationDuration={0.2}
          useAsSize={true}
          strokeWidth={9}
          radius={5}
          size={64}
        />
      </div>
    </motion.div>
  )
}
