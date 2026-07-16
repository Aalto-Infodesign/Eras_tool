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

export const SilhouettesMorph = () => {
  const { existingIdealSilhouettes, statesOrder, setStatesOrder } = useData()
  const { isHasse, setIsHasse } = useViz()
  const { toggleSilhouetteFilter, setSelectedSilhouettesNames, selectedSilhouettesNames } =
    useFilters()
  const { completeSilhouettes } = useDerivedData()
  const { resultsBySilhouette } = useClustering()

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
    hasse: {
      width: "100%",
      opacity: 1,
      x: 0,
      transition: { default: { ease: "easeInOut", when: "beforeChildren" }, width: { delay: 0.1 } },
    },
    trajectories: {
      width: "85%",
      opacity: 1,
      x: 0,

      transition: { default: { ease: "easeInOut", when: "afterChildren" }, width: { delay: 0 } },
    },
  }

  const chartVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
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
      animate={isHasse ? "hasse" : "trajectories"}
    >
      <SilhouettesHeader
        isHasse={isHasse}
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
      />

      <SilhouettesFilterBar
        selectedSilhouettesNames={selectedSilhouettesNames}
        toggleSilhouetteFilter={toggleSilhouetteFilter}
        setSelectedSilhouettesNames={setSelectedSilhouettesNames}
        animationDuration={animationDuration}
        isActive={isActive}
      />

      <motion.div key="silhouettes-main" className="silhouettes-main" layout>
        <AnimatePresence mode="popLayout">
          {features.hasseDiagram && isHasse ? (
            <motion.section
              layout
              key="hasse-wrapper"
              variants={chartVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ overflowX: "scroll" }}
            >
              {posetData ? (
                <HasseDiagram
                  posetData={posetData}
                  selectedSilhouettes={selectedSilhouettesNames}
                  toggleSilhouetteFilter={toggleSilhouetteFilter}
                  statesNamesLoaded={statesOrder}
                />
              ) : (
                <p>Loading...</p>
              )}
            </motion.section>
          ) : (
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
          )}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  )
}
