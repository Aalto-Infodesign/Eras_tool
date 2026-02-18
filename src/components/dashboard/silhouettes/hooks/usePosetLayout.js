import { useMemo } from "react"
import { getDominancePairsSelf } from "../../../../utils/POHelperFunctions"
import { po } from "../../../../utils/po"

import { groupBy, flattenDeep } from "lodash"

import { scalePoint, scaleLinear } from "d3"
import { useData } from "../../../../contexts/ProcessedDataContext"

export const useSilhouettesPoset = (statesNamesLoaded) => {
  const { silhouettes } = useData()
  // Step 1: Memoize the expensive poset creation
  const basePosetData = useMemo(() => {
    // Signal that computation is starting

    if (!silhouettes || silhouettes.length === 0 || !statesNamesLoaded) {
      return { poset: null, covers: [], leaves: [], orderedLeaves: [] }
    }

    const silhouetteNames = silhouettes.map((s) => s.name)
    const dominancePairs = getDominancePairsSelf(silhouetteNames)

    console.time("Poset Init")

    const { matrix, nodes } = po.domFromEdges(dominancePairs)
    const poset = po.createPoset(matrix, nodes)
    poset.setLayers()
    poset.setDepth()
    poset
      .enrich()
      .feature("parents", (name) => poset.getCovered(name).map((parent) => poset.features[parent]))
      .feature("children", (name) => poset.getCovering(name).map((child) => poset.features[child]))
      .feature("i", (name) => poset.elements.indexOf(name))
      .feature("statesArray", (name) => name.split("-"))
      .feature("orderedName", (name) => {
        const states = name.split("-")
        if (statesNamesLoaded?.length > 0) {
          return states.map((s) => statesNamesLoaded.indexOf(s).toString()).join("-")
        }
        return name
      })

    console.timeEnd("Poset Init")

    const leaves = poset.layers[poset.layers.length - 1] || []
    const orderedLeaves = [...leaves].sort((a, b) => {
      return poset.features[a].orderedName.localeCompare(poset.features[b].orderedName, "en", {
        numeric: true,
      })
    })

    const covers = poset.getCoverRelations()
    return { poset, covers, leaves, orderedLeaves, silhouetteNames }
  }, [silhouettes, statesNamesLoaded])

  return basePosetData
}

// Step 2: Memoize the layout calculations
export const usePosetLayout = (
  basePosetData,
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
    const { poset, covers, leaves, orderedLeaves, silhouetteNames } = basePosetData
    if (!poset) {
      return { poset: null, covers: [] }
    }

    const layersByLength = Object.entries(
      groupBy(flattenDeep(poset.layers), (l) => l.split("-").length),
    )

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
  }, [basePosetData, width, height, rectWidth, padding, hoveredNode, isHasse])

  return layoutData
}

const centerParentNodes = (parentName, poset) => {
  const children = poset.getCovering(parentName)
  if (!children || children.length === 0) return 0
  const childPositions = children.map((child) => poset.features[child].xPosition)
  return Math.min(...childPositions)
  return (Math.min(...childPositions) + Math.max(...childPositions)) / 2
}
