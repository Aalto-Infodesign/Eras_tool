import { useState } from "react"
import "./App.css"
import Dashboard from "./components/dashboard"
import { FileLoader } from "./components/fileLoader/FileLoader"
import { AnimatePresence } from "motion/react"
import { motion } from "motion/react"

function App() {
  const [data, setData] = useState([])
  const [statesData, setStatesData] = useState({})
  const [analytics, setAnalytics] = useState({})
  const [palette, setPalette] = useState([])
  const [scales, setScales] = useState({})
  const [silhouettes, setSilhouettes] = useState([])
  const [filters, setFilters] = useState([])
  const [statesOrder, setStatesOrder] = useState([])
  const [statesOrderOriginal, setStatesOrderOriginal] = useState([])
  const [isLegend, setIsLegend] = useState(false)

  const [idealSilhouettes, setIdealSilhouettes] = useState([])

  const newDataset = (data, statesData, analytics, palette, scales, silhouettes, filters) => {
    setData(data)
    setStatesData(statesData)
    setAnalytics(analytics)
    setPalette(palette)
    setScales(scales)
    setSilhouettes(silhouettes)
    setFilters(filters)
  }

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
    <main
      className="App"
      // style={{ position: isLegend && "relative" }}
    >
      <AnimatePresence>
        {data.length === 0 && (
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
        )}
      </AnimatePresence>
      <FileLoader
        newDataset={newDataset}
        statesOrder={statesOrder}
        setStatesOrder={setStatesOrder}
        statesOrderOriginal={statesOrderOriginal}
        setStatesOrderOriginal={setStatesOrderOriginal}
        isLegend={isLegend}
        setIsLegend={setIsLegend}
        silhouettes={silhouettes}
        setIdealSilhouettes={setIdealSilhouettes}
        idealSilhouettes={idealSilhouettes}
      />
      <AnimatePresence>
        {data.length > 0 && silhouettes && isLegend && (
          <Dashboard
            data={data}
            statesData={statesData}
            analytics={analytics}
            palette={palette}
            scales={scales}
            silhouettes={silhouettes}
            filters={filters}
            statesOrder={statesOrder}
            setStatesOrder={setStatesOrder}
            statesOrderOriginal={statesOrderOriginal}
            idealSilhouettes={idealSilhouettes}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
