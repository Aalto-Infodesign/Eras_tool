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
import { TitleAnimation } from "./components/landing/TitleAnimation"
import { Header } from "./components/Header/Header"

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
    <div className="App">
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
        {richData?.length && silhouettes && isLegend && (
          <>
            <Header />
            <Dashboard />
          </>
        )}
      </AnimatePresence>
      {isLegend && <SidePanel />}
    </div>
  )
}
