import { AnimatePresence, motion } from "motion/react"

import { ClearButton } from "../../common/Button/ClearButton"
import { SilhouetteChip } from "./shared/SilhouetteChips"

export function SilhouettesFilterBar({
  selectedSilhouettesNames,
  toggleSilhouetteFilter,
  setSelectedSilhouettesNames,
  animationDuration,
  isActive,
}) {
  return (
    <motion.div key={"filter-container"} className="filter-container">
      <ClearButton
        key={"clear-btn"}
        isActive={isActive}
        clearFunction={setSelectedSilhouettesNames}
      >
        Clear
      </ClearButton>
      <motion.div layout className="filter-bar padded">
        <AnimatePresence mode="popLayout">
          {selectedSilhouettesNames.map((s, _i) => {
            return (
              <SilhouetteChip
                key={s}
                s={s}
                animationDuration={animationDuration}
                toggleSilhouetteFilter={toggleSilhouetteFilter}
              />
            )
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
