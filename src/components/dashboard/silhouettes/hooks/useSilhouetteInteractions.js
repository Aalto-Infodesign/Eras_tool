import { useState, useEffect, useMemo } from "react"
import { xor, uniq } from "lodash"

export function useSilhouetteInteractions({
  completeSilhouettes,
  toggleSilhouetteFilter,
  statesOrder,
  setStatesOrder,
  isCmdPressed,
  existingIdealSilhouettes,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [derivedSilhouettes, setDerivedSilhouettes] = useState(null)
  const [expandSides, setExpandSides] = useState(false)
  const [orderMode, setOrderMode] = useState(existingIdealSilhouettes.length ? "distance" : "size")

  const orderedSilhouettes = useMemo(() => {
    // console.log("CS", completeSilhouettes)
    const sorted = [...completeSilhouettes].sort((a, b) => {
      if (a.isFiltered !== b.isFiltered) return a.isFiltered ? -1 : 1
      const aData = a.filtered ?? a
      const bData = b.filtered ?? b

      switch (orderMode) {
        case "size":
          return bData.size - aData.size
        case "distance":
          return bData.levenshteinDistance - aData.levenshteinDistance
        default:
          return 0
      }
    })

    return sorted
  }, [completeSilhouettes, orderMode])

  const deriveSilhouettesFromId = (id) => {
    // This function now only contains the core logic
    const next = completeSilhouettes.filter((s) => s.name.includes(id) && s.name !== id)
    const previous = completeSilhouettes.filter((s) => id.includes(s.name) && s.name !== id)
    const ds = { previous, next }
    setDerivedSilhouettes(ds)
  }

  const handleSilhouetteClick = (id) => {
    toggleSilhouetteFilter(id)
  }

  const handleExpandClick = (e, id) => {
    e.stopPropagation()
    setExpandSides(!expandSides)
    deriveSilhouettesFromId(id)
  }

  const handleLongPress = (id) => {
    setExpandSides(!expandSides)
    deriveSilhouettesFromId(id)
  }

  const handleOrderClick = (e, s) => {
    e.stopPropagation()

    const newOrder = uniq(s.name.split("-"))
    const leftOut = xor(statesOrder, newOrder)

    newOrder.push(...leftOut)

    setStatesOrder(newOrder)
  }

  // 1. Use useEffect to react to state changes
  useEffect(() => {
    // If Cmd is pressed or expandSides is true, and an item is being hovered...
    if (isCmdPressed && hoveredIndex !== null) {
      // Get the name/id of the currently hovered item
      const hoveredItemName = completeSilhouettes[hoveredIndex].name
      deriveSilhouettesFromId(hoveredItemName)
    }

    // 2. Add cleanup logic for when the effect should be reversed
    if (!isCmdPressed || hoveredIndex === null) {
      setDerivedSilhouettes(null)
      // setExpandSides(false)
    }
  }, [isCmdPressed, hoveredIndex, completeSilhouettes]) // Dependencies: run when these values change

  return {
    hoveredIndex,
    setHoveredIndex,
    derivedSilhouettes,
    expandSides,
    setExpandSides,
    orderMode,
    setOrderMode,
    orderedSilhouettes,
    handleSilhouetteClick,
    handleExpandClick,
    handleLongPress,
    handleOrderClick,
  }
}
