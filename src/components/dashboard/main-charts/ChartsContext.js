import { createContext, useEffect, useMemo, useState, useContext } from "react"
import { useData } from "../../../contexts/ProcessedDataContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { scaleBand, scaleLinear } from "d3"
import { useModifierKey } from "../../hooks/useModifierKey"

const ChartsContext = createContext(null)

const MOTION_THRESHOLD = 25000

export function ChartsProvider({ children }) {
  const { statesOrder } = useData()
  const { data, analytics, selectedLinks } = useDerivedData()

  const [hoveredTrajectoriesIDs, setHoveredTrajectoriesIDs] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const reduceMotion = useMemo(() => data.length > MOTION_THRESHOLD, [data.length])

  const isArrowLeft = useModifierKey("ArrowLeft")
  const isArrowRight = useModifierKey("ArrowRight")

  // clamp selectedIndex when hoveredTrajectoriesIDs length changes
  useEffect(() => {
    const maxIndex = Math.max(0, hoveredTrajectoriesIDs.length - 1)
    setSelectedIndex((prev) => Math.min(prev, maxIndex))
  }, [hoveredTrajectoriesIDs.length])

  // navigate selectedIndex with Left/Right arrows while modifier key is pressed
  useEffect(() => {
    if (isArrowRight) {
      setSelectedIndex((prev) => {
        const max = Math.max(0, hoveredTrajectoriesIDs.length - 1)
        return Math.min(prev + 1, max)
      })
    } else if (isArrowLeft) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    }
  }, [isArrowLeft, isArrowRight, hoveredTrajectoriesIDs.length])

  const w = 170
  const marginTop = 10
  //For File Loader
  const minHeight = 100
  let stateIncrement = 0

  if (statesOrder.length > 0 && statesOrder.length < 5) {
    stateIncrement = minHeight / statesOrder.length
  } else if (statesOrder.length >= 5 && statesOrder.length <= 10) {
    stateIncrement = 20
  } else if (statesOrder.length > 10) {
    stateIncrement = 15
  }

  // const h = document.querySelector(".chart-container").
  const h = statesOrder.length * stateIncrement

  const chartScales = useMemo(
    () => ({
      x: scaleLinear(analytics.ageRange, [0, w]),
      y: scaleBand(statesOrder, [0, h]),
    }),
    [analytics.ageRange, statesOrder, w, h],
  )

  const enableScrub = selectedLinks.length < 2000

  const value = useMemo(
    () => ({
      w,
      h,
      marginTop,
      chartScales,
      enableScrub,
      reduceMotion,
      selectedIndex,
      hoveredTrajectoriesIDs,
      setHoveredTrajectoriesIDs,
    }),
    [
      w,
      h,
      marginTop,
      chartScales,
      enableScrub,
      reduceMotion,
      selectedIndex,
      hoveredTrajectoriesIDs,
      setHoveredTrajectoriesIDs,
    ],
  )

  return <ChartsContext.Provider value={value}>{children}</ChartsContext.Provider>
}

// Custom hook to use the data context
export function useCharts() {
  const context = useContext(ChartsContext)
  if (!context) {
    throw new Error("useCharts must be used within a ChartsProvider")
  }
  return context
}
