import { includes } from "lodash"
import { AnimatePresence, motion } from "motion/react"
import { Download, Shuffle } from "lucide-react"

import Button from "../../common/Button/Button"
import { SilhouetteCardMain } from "./SilhouetteCardMain"
import { downloadIDs } from "../../../utils/exportFunctions"

export function SilhouetteCard({
  s,
  i,
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
  const isHovered = hoveredIndex === i
  const isSelected = includes(selectedSilhouettesNames, s.name)

  const isCmdHovered = isCmdPressed && isHovered
  const isSelectedExpand = expandSides && isSelected && isHovered

  const isSideVisible = isCmdHovered || isSelectedExpand

  const isExpandible = true

  const clusteredData = resultsBySilhouette.get(s.name)

  const opacity = !filtersActive
    ? 1
    : s.isFiltered
      ? (isCmdPressed || expandSides) && hoveredIndex !== null && !isHovered
        ? 0.5
        : 1
      : 0.5

  const cardVariants = {
    hidden: { opacity: 1, scale: 1 },
    visible: {
      scale: 1,
      opacity: opacity,
      // gap: isSideVisible ? "var(--spacing-xs)" : 0,
      transition: {
        opacity: { duration: 0.2 },
      },
    },
    hover: {
      backgroundColor: "var(--surface-primary)",
    },
    disabled: { opacity: 0.5 },
  }

  const templateVariants = {
    hidden: {
      visibility: "hidden",
      opacity: 0,
      height: 0,
      transition: { duration: 0.15 },
    },
    hover: {
      visibility: "visible",
      opacity: 1,
      height: "auto",
      transition: { duration: 0.15 },
    },
  }

  const ids = s.trajectories.map((d) => d[0]?.id ?? "id not found")
  return (
    <motion.div
      key={`card-${s.name}-${i}`}
      className="silhouette-card"
      variants={cardVariants}
      initial={"hidden"}
      animate={clusteredData ? "hidden" : "disabled"}
      whileHover={"hover"}
      // animate={isHasse ? "hidden" : "visible"}
      exit={"hidden"}
      // exit={{ opacity: 0, scale: 0.5, transition: { duration: 1 } }}
      // whileHover={{
      //   backgroundColor: isSideVisible ? "var(--surface-tertiary)" : "none",
      //   // padding: isSideVisible ? "var(--spacing-xs)" : "0 16px 0 0",
      // }}
      // whileTap={{ scale: !isCmdPressed || !expandSides ? 0.95 : 1 }}
      onHoverStart={() => setHoveredIndex(i)}
      onHoverEnd={() => {
        setHoveredIndex(null)
        setExpandSides(false)
      }}
    >
      <AnimatePresence>
        <motion.div className="card-btn-wrapper" variants={templateVariants}>
          {/* TODO In hover su typology mostra DW btn */}
          {s.trajectories[0].length !== 0 && (
            <Button
              size="xs"
              variant="secondary"
              className="download"
              tooltip={"Export IDs"}
              whileHover={{ scale: 1.2 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => downloadIDs(e, ids)}
            >
              <Download size={9} />
            </Button>
          )}
          {/* TODO In hover su typology mostra DW btn */}
          <Button
            size="xs"
            variant="secondary"
            className="order"
            tooltip={"Order states"}
            whileHover={{ scale: 1.2 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleOrderClick(e, s)}
          >
            <Shuffle size={9} />
          </Button>
        </motion.div>
      </AnimatePresence>

      <div>
        {/* <AnimatePresence>
          {Array.isArray(derivedSilhouettes?.previous) &&
            derivedSilhouettes.previous.length > 0 &&
            isSideVisible && (
              <SubsetSelection
                subset={derivedSilhouettes.previous}
                selectedSilhouettes={selectedSilhouettesNames}
                toggleSilhouetteFilter={toggleSilhouetteFilter}
                animationDuration={animationDuration}
              />
            )}
        </AnimatePresence> */}

        <SilhouetteCardMain
          s={s}
          i={i}
          animationDuration={animationDuration}
          isSelected={isSelected}
          handleSilhouetteClick={handleSilhouetteClick}
          downloadIDs={downloadIDs}
          isHovered={isHovered}
          handleExpandClick={handleExpandClick}
          expandSides={expandSides}
          isCmdPressed={isCmdPressed}
          isExpandible={isExpandible}
          handleLongPress={handleLongPress}
          isHasse={isHasse}
          handleOrderClick={handleOrderClick}
          idealSilhouettes={idealSilhouettes}
        />

        {/* <AnimatePresence>
          {derivedSilhouettes?.next.length > 0 && isSideVisible && (
            <SubsetSelection
              subset={derivedSilhouettes.next}
              selectedSilhouettes={selectedSilhouettesNames}
              toggleSilhouetteFilter={toggleSilhouetteFilter}
              animationDuration={animationDuration}
            />
          )}
        </AnimatePresence> */}
      </div>
    </motion.div>
  )
}
