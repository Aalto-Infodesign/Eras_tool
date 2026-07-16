import { useState } from "react"
import { includes } from "lodash"

import { motion } from "motion/react"

import { SilhouettePathSvg } from "./SilhouettePathSvg"
import { CloseButton } from "../../../common/Button/CloseButton"

export function SubsetSelection({ subset, selectedSilhouettes, toggleSilhouetteFilter }) {
  const subsetNames = subset.map((s) => s.name)

  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "2rem" }}
      exit={{ opacity: 0, width: 0 }}
      className="subset-selection"
    >
      <div
        className="selection-container"
        style={{ display: "flex", flexDirection: "column", gap: "2px" }}
      >
        {subsetNames.map((s, i) => {
          const isSelected = includes(selectedSilhouettes, s)
          return (
            <SilhouetteToggleButton
              silhouetteName={s}
              isSelected={isSelected}
              toggleSilhouetteFilter={toggleSilhouetteFilter}
            />
          )
        })}
      </div>
    </motion.div>
  )
}

export function SilhouetteToggleButton({ silhouetteName, isSelected, toggleSilhouetteFilter }) {
  // const viewRef = useRef(null)
  return (
    <motion.div
      key={`toggle-${silhouetteName}`}
      // ref={viewRef}
      className={`chip subset-chip ${isSelected ? "selected" : ""}`}
      whileTap={{ scale: 0.9 }}
      onClick={() => toggleSilhouetteFilter(silhouetteName)}
    >
      <SmallSilhouette silhouetteName={silhouetteName} />
    </motion.div>
  )
}

export function SmallSilhouette({ silhouetteName }) {
  if (silhouetteName.length > 1)
    return (
      <motion.div layout transition={{ duration: 0.2 }} className="chip-svg-wrapper">
        <SilhouettePathSvg
          keyName="chip"
          silhouetteName={silhouetteName}
          size={30}
          strokeWidth={10}
        />
      </motion.div>
    )
  else return <span>{silhouetteName}</span>
}

const chipVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
}

export function SilhouetteChip({ s, animationDuration, toggleSilhouetteFilter }) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <motion.div
      variants={chipVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      whileHover="hover"
      transition={{ duration: 0.2 }}
      layout
      className="chip silhouette-chip"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <CloseButton isVisible={isHovered} onClick={() => toggleSilhouetteFilter(s)} />

      <SmallSilhouette silhouetteName={s} animationDuration={animationDuration} />
    </motion.div>
  )
}
