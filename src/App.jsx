import "./App.css"
import Dashboard from "./components/Dashboard"
import { FileLoader } from "./components/fileLoader/FileLoader"
import { AnimatePresence } from "motion/react"
import { motion } from "motion/react"
import { RawDataProvider } from "./contexts/RawDataContext"
import { ProcessedDataProvider, useData } from "./contexts/ProcessedDataContext"
import { VizProvider, useViz } from "./contexts/VizContext"
import { FiltersProvider } from "./contexts/FiltersContext"
import { DerivedDataProvider } from "./contexts/DerivedDataContext"
import { SidePanel } from "./components/dashboard/side-panel/SidePanel"

import { Loader } from "lucide-react"

function App() {
  return (
    <RawDataProvider>
      <ProcessedDataProvider>
        <VizProvider>
          <FiltersProvider>
            <DerivedDataProvider>
              <AppContent />
            </DerivedDataProvider>
          </FiltersProvider>
        </VizProvider>
      </ProcessedDataProvider>
    </RawDataProvider>
  )
}

export default App

function AppContent() {
  const { richData, silhouettes } = useData()
  const { isLegend, isLoading } = useViz()

  return (
    <>
      <main
        className="App"
        // style={{ position: isLegend && "relative" }}
      >
        <AnimatePresence>{!richData?.length && <TitleAnimation />}</AnimatePresence>
        {isLoading && (
          <div
            style={{
              position: "absolute",
              width: 100,
              height: 100,
              bottom: 0,
              right: 0,
              background: "rgba(0, 0, 0, 0)",
              zIndex: 9999,
              display: "grid",
              placeItems: "center", // centers your spinner
            }}
          >
            <motion.div animate={{ rotate: 180 }} transition={{ repeat: Infinity, duration: 2 }}>
              <Loader />
            </motion.div>
          </div>
        )}
        <FileLoader />
        <AnimatePresence>
          {richData?.length && silhouettes && isLegend && <Dashboard />}
        </AnimatePresence>
      </main>
      {isLegend && <SidePanel />}
    </>
  )
}

function TitleAnimation() {
  const titleVariants = {
    hidden: { opacity: 0, y: 0, filter: "blur(4px)" },
    one: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: "easeInOut" },
    },
    two: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: "easeInOut", delay: 0.8 },
    },
    three: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: "easeInOut", delay: 1.4 },
    },
  }
  return (
    <motion.div
      variants={titleVariants}
      initial="hidden"
      animate="one"
      exit={"hidden"}
      className="app-title"
    >
      <motion.p variants={titleVariants} initial="hidden" animate="one">
        FinnGen's
      </motion.p>
      <motion.h1 variants={titleVariants} initial="hidden" animate="two">
        The Eras Tool
      </motion.h1>
      <motion.p variants={titleVariants} initial="hidden" animate="three">
        Track evolution over time
      </motion.p>
    </motion.div>
  )
}
