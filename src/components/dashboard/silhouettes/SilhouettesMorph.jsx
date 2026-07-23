import { useMemo, useRef } from "react"

import { HasseDiagram } from "./Hasse/HasseDiagram"

import { AnimatePresence, motion } from "motion/react"

import "./Silhouettes.css"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { usePosetWorker } from "../../hooks/workerHooks/usePosetWorker"
import { features } from "../../../config/features"
import { useClustering } from "../../../contexts/ClusteringContext"

import { useSilhouetteInteractions } from "./hooks/useSilhouetteInteractions"
import { SilhouettesHeader } from "./SilhouettesHeader"
import { SilhouettesFilterBar } from "./SilhouettesFilterBar"
import { SilhouettesList } from "./SilhouettesList"
import { Dialog } from "../../common/Dialog/Dialog"

export const SilhouettesMorph = () => {
  const { existingIdealSilhouettes, statesOrder, setStatesOrder } = useData()
  const { isHasse, setIsHasse } = useViz()
  const { toggleSilhouetteFilter, setSelectedSilhouettesNames, selectedSilhouettesNames } =
    useFilters()
  const { completeSilhouettes } = useDerivedData()
  const { resultsBySilhouette } = useClustering()

  const hasseDialogRef = useRef(null)

  const posetData = usePosetWorker().result

  const {
    setHoveredIndex,
    setExpandSides,
    orderMode,
    setOrderMode,
    orderedSilhouettes,
    silhouettesInPercentRange,
    handleSilhouetteClick,
    handleLongPress,
    handleOrderClick,
    percentRange,
    setPercentRange,
  } = useSilhouetteInteractions({
    completeSilhouettes,
    toggleSilhouetteFilter,
    statesOrder,
    setStatesOrder,
    existingIdealSilhouettes,
  })

  const existingIdealSilhouettesNames = useMemo(
    () => existingIdealSilhouettes.map((s) => s.name),
    [existingIdealSilhouettes],
  )

  const containerRef = useRef()

  const isActive = selectedSilhouettesNames.length > 0

  const animationDuration = completeSilhouettes.length > 50 ? 0 : 0.2

  const boxVariants = {
    hidden: { opacity: 0 },
    trajectories: {
      width: "85%",
      opacity: 1,
      x: 0,

      transition: { default: { ease: "easeInOut", when: "afterChildren" }, width: { delay: 0 } },
    },
  }

  return (
    <motion.section
      key={"silhouettes"}
      ref={containerRef}
      layout
      layoutId="silhouettes"
      className="bento-item silhouettes"
      variants={boxVariants}
      initial={"hidden"}
      animate={"trajectories"}
    >
      <SilhouettesHeader
        setIsHasse={setIsHasse}
        posetData={posetData}
        orderMode={orderMode}
        setOrderMode={setOrderMode}
        existingIdealSilhouettes={existingIdealSilhouettes}
        existingIdealSilhouettesNames={existingIdealSilhouettesNames}
        selectedSilhouettesNames={selectedSilhouettesNames}
        setSelectedSilhouettesNames={setSelectedSilhouettesNames}
        percentRange={percentRange}
        setPercentRange={setPercentRange}
        silhouettesInPercentRange={silhouettesInPercentRange}
        hasseDialogRef={hasseDialogRef}
      />

      <motion.div key="silhouettes-main" className="silhouettes-main" layout>
        <SilhouettesList
          key="scroller-wrapper"
          orderedSilhouettes={orderedSilhouettes}
          setHoveredIndex={setHoveredIndex}
          setExpandSides={setExpandSides}
          selectedSilhouettesNames={selectedSilhouettesNames}
          resultsBySilhouette={resultsBySilhouette}
          animationDuration={animationDuration}
          handleSilhouetteClick={handleSilhouetteClick}
          handleLongPress={handleLongPress}
          handleOrderClick={handleOrderClick}
          idealSilhouettes={existingIdealSilhouettes}
          percentRange={percentRange}
        />
      </motion.div>
      <SilhouettesFilterBar
        selectedSilhouettesNames={selectedSilhouettesNames}
        toggleSilhouetteFilter={toggleSilhouetteFilter}
        setSelectedSilhouettesNames={setSelectedSilhouettesNames}
        animationDuration={animationDuration}
        isActive={isActive}
      />
      <Dialog
        ref={hasseDialogRef}
        onClose={() => setIsHasse(false)}
        title={"Hasse diagram"}
        width="1100px"
      >
        <section className="hasse-wrapper" style={{ overflowX: "scroll" }}>
          {isHasse && (
            <HasseDiagram
              posetData={posetData}
              selectedSilhouettes={selectedSilhouettesNames}
              toggleSilhouetteFilter={toggleSilhouetteFilter}
              statesNamesLoaded={statesOrder}
            />
          )}
        </section>
      </Dialog>
    </motion.section>
  )
}
