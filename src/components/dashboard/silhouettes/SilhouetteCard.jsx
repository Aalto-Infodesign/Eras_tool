import { motion } from "motion/react"
import { Download, Shuffle } from "lucide-react"

import Button from "../../common/Button/Button"
import { SilhouetteCardMain } from "./SilhouetteCardMain"
import { downloadIDs } from "../../../utils/exportFunctions"

export function SilhouetteCard({
  silhouette,
  index,
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
  const isSelected = selectedSilhouettesNames.includes(silhouette.name)
  const isClusteringPending = !resultsBySilhouette.get(silhouette.name)
  const isInPercentRange =
    silhouette.percentage >= percentRange[0] && silhouette.percentage <= percentRange[1]

  const cardVariants = {
    rest: { opacity: isInPercentRange ? 1 : 0.5, scale: 1 },
    pending: { opacity: 0.5 },
    hover: { backgroundColor: "var(--surface-primary)" },
  }

  // Variant labels propagate from the card: the buttons stay hidden at "rest"
  // (and while "pending", which they don't define) and appear on "hover".
  const actionButtonsVariants = {
    rest: {
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

  const hasExportableIds = silhouette.trajectories[0].length !== 0
  const handleDownloadClick = (e) => {
    const ids = silhouette.trajectories.map((t) => t[0]?.id ?? "id not found")
    downloadIDs(e, ids)
  }

  return (
    <motion.div
      key={`card-${silhouette.name}-${index}`}
      className="silhouette-card"
      variants={cardVariants}
      initial="rest"
      animate={isClusteringPending ? "pending" : "rest"}
      whileHover="hover"
      exit="rest"
      onHoverStart={() => setHoveredIndex(index)}
      onHoverEnd={() => {
        setHoveredIndex(null)
        setExpandSides(false)
      }}
    >
      {/* TODO In hover su typology mostra DW btn */}
      <motion.div className="card-btn-wrapper" variants={actionButtonsVariants}>
        {hasExportableIds && (
          <Button
            size="xs"
            variant="secondary"
            className="download"
            tooltip={"Export IDs"}
            whileHover={{ scale: 1.2 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleDownloadClick}
          >
            <Download size={9} />
          </Button>
        )}
        <Button
          size="xs"
          variant="secondary"
          className="order"
          tooltip={"Order states"}
          whileHover={{ scale: 1.2 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => handleOrderClick(e, silhouette)}
        >
          <Shuffle size={9} />
        </Button>
      </motion.div>

      <div>
        <SilhouetteCardMain
          silhouette={silhouette}
          index={index}
          animationDuration={animationDuration}
          isSelected={isSelected}
          handleSilhouetteClick={handleSilhouetteClick}
          handleLongPress={handleLongPress}
          idealSilhouettes={idealSilhouettes}
        />
      </div>
    </motion.div>
  )
}
