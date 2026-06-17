import { motion } from "motion/react"

import { SilhouettePathSvg } from "./shared/SilhouettePathSvg"
import { useLongPressWithProgress } from "../../hooks/useLongPress"
import { useIsTouchDevice } from "../../hooks/useIsTouchDevice"

export function SilhouetteCardMain({ s, i, ...props }) {
  const {
    isSelected,
    handleSilhouetteClick,
    downloadIDs,
    isHovered,

    isCmdPressed,
    isExpandible,
    handleLongPress,

    animationDuration,
    handleOrderClick,
    idealSilhouettes,
  } = props

  const isTouchDevice = useIsTouchDevice()

  const longPressProps = useLongPressWithProgress({
    onLongPress: () => {
      isTouchDevice && handleLongPress(s.name)
    },
    onClick: () => isTouchDevice && handleSilhouetteClick(s.name),
    threshold: 500,
    onProgress: (progress) => {},
  })

  const handleCardClick = () => {
    !isTouchDevice && handleSilhouetteClick(s.name)
  }

  const cardVariants = {
    hidden: { opacity: 1, y: 0 },
    // hidden: { opacity: 1, y: 5 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: animationDuration,
        delay: isCmdPressed || animationDuration === 0 ? 0 : 1 + i * 0.04,
        ease: "easeInOut",
      },
    }),
    tapped: { scale: 0.96, transition: { duration: 0.2 } },
  }

  const showFilterLabel = s.isFiltered && s.percentage !== s.filtered.percentage

  return (
    <motion.div
      key={`typology-card-${s.name}-${i}`}
      custom={i}
      variants={cardVariants}
      initial={"hidden"}
      animate={"visible"}
      exit={"hidden"}
      className={`typology
                      ${isSelected ? "selected" : ""}`}
      whileTap={"tapped"}
      onClick={handleCardClick}
      {...longPressProps}
      // ref={inViewRef}
    >
      <span className="typology-perc-wrapper">
        <span className={`typology-perc-text ${showFilterLabel && "filtered"}`}>
          {s.percentage > 1
            ? s.percentage.toFixed(showFilterLabel ? 1 : 2)
            : s.percentage.toFixed(2)}
          %
        </span>

        {showFilterLabel && (
          <span className="typology-perc-text">{s.filtered.percentage.toFixed(2)}%</span>
        )}
      </span>

      <span className="typology-perc-wrapper">
        <span className={`typology-perc-text ${showFilterLabel && "filtered"}`}>
          {s.size > 1 ? s.size : s.size}
        </span>

        {showFilterLabel && (
          <span className="typology-perc-text">
            {s.filtered.size > 1 ? s.filtered.size : s.filtered.size}
          </span>
        )}
      </span>

      {idealSilhouettes.length > 0 && (
        <span className="typology-perc-text">{s.levenshteinDistance.toFixed(2)}</span>
      )}

      {/* TODO Capire QUAL'é LA BEST MATCH */}
      {s.levenshteinDistance > 0.9 && <span className="top-banner">★</span>}

      <div className={`silhouette-wrapper `}>
        <SilhouettePathSvg
          keyName="card"
          silhouetteName={s.name}
          animationDuration={0.2}
          useAsSize={true}
          strokeWidth={9}
          radius={9}
        />
      </div>
      {/* <AnimatePresence>
        {isHovered && isSelected && !isCmdPressed && isExpandible && (
          <div className="expand">
            <AnimatePresence>
              {isTouchDevice && longPressProps?.isPressed && (
                <motion.div
                  className="progress-bar"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.round(longPressProps.progress * 4)}rem`,
                    transition: { duration: 0.1 },
                  }}
                  exit={{ width: 0 }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    backgroundColor: "white",
                    opacity: 0.25,
                  }}
                />
              )}
            </AnimatePresence>
            <motion.button
              className="btn"
              onClick={(e) => handleExpandClick(e, s.name)}
              whileTap={{ scale: 0.9, transition: { duration: 0.2, delay: 0 } }}
            >
              {expandSides ? "Hide" : "Expand"}
            </motion.button>
          </div>
        )}
      </AnimatePresence> */}
    </motion.div>
  )
}
