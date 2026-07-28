import { createContext, useEffect, useMemo, useState, useContext, useRef, useCallback } from "react"
import { useData } from "../../../contexts/ProcessedDataContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { scaleBand, scaleLinear } from "d3"
import { useModifierKey } from "../../hooks/useModifierKey"
import { useRect } from "hamo"
import { useLocalStorage } from "react-use"

const ChartsContext = createContext(null)

const MOTION_THRESHOLD = 20000

export function ChartsProvider({ children }) {
  const { statesOrder } = useData()
  const { analytics, selectedLinks } = useDerivedData()

  const [hoveredTrajectoriesIDs, setHoveredTrajectoriesIDs] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isMartiniDone, setIsMartiniDone] = useState(false)

  // ! TURN ON WHEN IN ACTUAL PRODUCTION
  // const [isMartiniDone, setIsMartiniDone, removeMartiniData] = useLocalStorage(
  //   "martini-done",
  //   false,
  // )

  // const reduceMotion = useMemo(() => data.length > MOTION_THRESHOLD, [data.length])
  const reduceMotion = false

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

  const w = 175
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

  // Shared rendered pixel height of the main trajectories SVG. The trajectories
  // SVG is the width-driven "driver": it sizes itself from its grid column, and
  // every sibling that must vertically align (distributions, state labels,
  // legend scroller) pins itself to this measured value with `width: auto`.
  // A ResizeObserver keeps it live across window resizes, max-height media
  // breakpoints, and state add/remove (all of which change the driver's height).
  // NOTE: attach `measureChartRef` ONLY to the driver — never to a follower,
  // or the follower's height would feed back into the value that sets it.
  const [chartHeight, setChartHeight] = useState(0)
  const chartObserverRef = useRef(null)

  const measureChartRef = useCallback((node) => {
    if (chartObserverRef.current) {
      chartObserverRef.current.disconnect()
      chartObserverRef.current = null
    }
    if (node) {
      const ro = new ResizeObserver((entries) => {
        const height = entries[0]?.contentRect?.height
        if (height) setChartHeight(height)
      })
      ro.observe(node)
      chartObserverRef.current = ro
    }
  }, [])

  useEffect(() => () => chartObserverRef.current?.disconnect(), [])

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
      chartHeight,
      measureChartRef,
      isMartiniDone,
      setIsMartiniDone,
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
      chartHeight,
      measureChartRef,
      isMartiniDone,
      setIsMartiniDone,
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
