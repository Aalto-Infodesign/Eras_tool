import "./App.css"
import Dashboard from "./components/dashboard"
import { FileLoader } from "./components/fileLoader/FileLoader"
import { AnimatePresence } from "motion/react"
import { motion } from "motion/react"
import { RawDataProvider } from "./contexts/RawDataContext"
import { DataProvider, useData } from "./contexts/DataContext"
import { VizProvider, useViz } from "./contexts/VizContext"

function App() {
  return (
    <DataProvider>
      <VizProvider>
        <AppContent />
      </VizProvider>
    </DataProvider>
  )
}

export default App

function AppContent() {
  const { data, silhouettes } = useData()
  const { isLegend } = useViz()

  return (
    <main
      className="App"
      // style={{ position: isLegend && "relative" }}
    >
      <AnimatePresence>{data.length === 0 && <TitleAnimation />}</AnimatePresence>
      <FileLoader />
      <AnimatePresence>
        {data.length > 0 && silhouettes && isLegend && <Dashboard />}
      </AnimatePresence>
    </main>
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
