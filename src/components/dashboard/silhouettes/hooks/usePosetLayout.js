import { useMemo } from "react"
import { getDominancePairsSelf } from "../../../../utils/POHelperFunctions"
import { po } from "../../../../utils/po"

import { groupBy, flattenDeep } from "lodash"

import { scalePoint, scaleLinear } from "d3"
import { useData } from "../../../../contexts/ProcessedDataContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"

export const useSilhouettesPoset = (posetData, statesNamesLoaded) => {
  // const { silhouettes } = useData()
  const { completeSilhouettes } = useDerivedData()

  console.log("PO STRUCT", posetData)

  const poset = useMemo(() => {
    if (!posetData || !statesNamesLoaded) return null

    const newPoset = po.createPoset(posetData.posetStructure)

    return newPoset
  }, [posetData])

  // Step 2: Cheap ordering layer — re-runs when statesNamesLoaded changes
  const orderedData = useMemo(() => {
    if (!poset || !statesNamesLoaded) return null

    const { leaves } = posetData

    // Add/overwrite the orderedName feature now that we have statesNamesLoaded
    poset.feature("orderedName", (name) => {
      const states = name.split("-")
      if (statesNamesLoaded?.length > 0) {
        return states.map((s) => statesNamesLoaded.indexOf(s).toString()).join("-")
      }
      return name
    })

    const orderedLeaves = [...leaves].sort((a, b) =>
      poset.features[a].orderedName.localeCompare(poset.features[b].orderedName, "en", {
        numeric: true,
      }),
    )

    return { ...posetData, poset: poset, orderedLeaves }
  }, [posetData, statesNamesLoaded])

  const filteredData = useMemo(() => {
    if (!orderedData || !completeSilhouettes) return null

    const { poset } = orderedData
    const filteredSilhouettesNames = completeSilhouettes
      .filter((s) => s.isFiltered)
      .map((s) => s.name)
    console.log(filteredSilhouettesNames)
    // Add/overwrite the orderedName feature now that we have statesNamesLoaded
    poset.feature("included", (name) => {
      const included = filteredSilhouettesNames.includes(name)
      return included
    })

    return orderedData
  }, [orderedData, completeSilhouettes])

  return filteredData ?? { poset: null, covers: [], leaves: [], orderedLeaves: [] }
}

// Step 2: Memoize the layout calculations
export const usePosetLayout = (
  posetData,
  width,
  height,
  rectWidth,
  rectHeight,
  padding,
  hoveredNode,
  isHasse,
) => {
  console.time("Poset Layout")

  const paddingX = 80

  const layoutData = useMemo(() => {
    const { poset, covers, leaves, orderedLeaves, silhouetteNames } = posetData
    if (!poset) {
      return { poset: null, covers: [] }
    }

    console.log("POSET", poset)

    const layersByLength = Object.entries(
      groupBy(flattenDeep(poset.layers), (l) => l.split("-").length),
    )
    console.log(layersByLength)

    const namesForScale = isHasse ? orderedLeaves : silhouetteNames
    const xRange = isHasse
      ? [paddingX, width - padding]
      : [rectWidth / 2 + 1, width - rectWidth / 2 - 1]
    const yRange = isHasse ? [padding, height - padding] : [rectHeight / 2 + 1, rectHeight / 2 - 1]

    const xPointScale = scalePoint(namesForScale, xRange)
    const yScale = scaleLinear([1, layersByLength[layersByLength.length - 1][0]], yRange)

    poset.feature("yPositionScaled", (_name, d) => yScale(d.statesArray.length))
    !isHasse && poset.feature("xPosition", (name) => xPointScale(name))

    // Fisheye/Magnification Logic
    let siblingScale = null
    let leftScale = null
    let rightScale = null
    let focusX = null
    let siblingNames = []
    const segmentPadding = 20

    if (
      isHasse &&
      hoveredNode &&
      leaves.includes(hoveredNode.name) &&
      width / leaves.length < rectWidth
    ) {
      const parentName = poset.getCovered(hoveredNode.name)[0]
      const parent = poset.features[parentName]

      if (parent) {
        const siblings = parent.children
        focusX = xPointScale(hoveredNode.name)
        siblingNames = siblings.map((d) => d.name)
        const orderedSiblingNames = [...siblingNames].sort((a, b) => {
          return a.localeCompare(b, "en", { numeric: true })
        })

        const magnifiedGroupWidth = siblingNames.length * rectWidth
        const groupStart =
          focusX - magnifiedGroupWidth / 2 < padding ? padding : focusX - magnifiedGroupWidth / 2
        const groupEnd = groupStart + magnifiedGroupWidth

        siblingScale = scalePoint().domain(orderedSiblingNames).range([groupStart, groupEnd])
        leftScale = scaleLinear()
          .domain([padding, focusX])
          .range([padding, groupStart - segmentPadding])
        rightScale = scaleLinear()
          .domain([focusX, width - padding])
          .range([groupEnd + segmentPadding, width - padding])
      }
    }

    const setXPosition = (name) => {
      if (siblingScale && leftScale && rightScale) {
        if (siblingNames.includes(name)) {
          return siblingScale(name)
        }
        const originalX = xPointScale(name)
        return originalX < focusX ? leftScale(originalX) : rightScale(originalX)
      }
      return xPointScale(name)
    }

    isHasse &&
      poset.climber(function (layer, h) {
        layer.forEach((name) => {
          poset.features[name].xPosition =
            h === 0 ? setXPosition(name) : centerParentNodes(name, poset)
        })
      })

    const coversByRoot = groupBy(covers, (c) => c.source.split("-")[0])

    console.log(coversByRoot)
    console.timeEnd("Poset Layout")

    return { poset, covers, yScale, layersByLength }
  }, [posetData, width, height, rectWidth, padding, hoveredNode, isHasse])

  return layoutData
}

const centerParentNodes = (parentName, poset) => {
  const children = poset.getCovering(parentName)
  if (!children || children.length === 0) return 0
  const childPositions = children.map((child) => poset.features[child].xPosition)
  return Math.min(...childPositions)
  return (Math.min(...childPositions) + Math.max(...childPositions)) / 2
}
