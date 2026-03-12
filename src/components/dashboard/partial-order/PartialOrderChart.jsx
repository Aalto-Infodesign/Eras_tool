import { useContext, useMemo } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"
import { po } from "../../../utils/po"
import { flatten } from "lodash"
import { getDominancePairs } from "../../../utils/POHelperFunctions"
import { Sankey } from "./OptimizedSankey"

import { useData } from "../../../contexts/ProcessedDataContext"
import { CircleAlert, CircleSlash } from "lucide-react"

import "./PartialOrderChart.css"
import { useDerivedData } from "../../../contexts/DerivedDataContext"

// TODO Use idealSilhouettes to highlight nodes/links in the sankey diagram

const useSankeyData = (silhouettes, filteredLinks, idealSilhouettes) => {
  return useMemo(() => {
    if (!silhouettes || !filteredLinks || silhouettes.length === 0) {
      return { nodes: [], links: [] }
    }

    // --- Step 1: Create efficient lookup maps ---

    // OPTIMIZATION: Create a Map for O(1) lookup of silhouette name by trajectory ID.
    // This is much faster than filtering an array for every link.
    const trajectoryToSilhouetteMap = new Map()
    silhouettes.forEach((s) => {
      s.trajectories.forEach((t) => {
        // Assuming t[0] exists and has an id
        if (t[0]?.id) {
          trajectoryToSilhouetteMap.set(t[0].id, s.name)
        }
      })
    })

    // console.log("Trajectory to Silhouette Map:", trajectoryToSilhouetteMap)

    // console.log("Filtered Links:", filteredLinks)

    // Helper function to add sequential order to link states
    const addOrderToStates = (links) => {
      if (!links || links.length === 0) return []
      let orderCounter = 0
      let currentId = links[0].id

      return links.map((item) => {
        if (item.id !== currentId) {
          currentId = item.id
          orderCounter = 0
        }
        const newOrder = orderCounter
        orderCounter++

        return {
          ...item,
          source: {
            ...item.source,
            order: newOrder,
            id: `${item.source.state}_${newOrder}`,
          },
          target: {
            ...item.target,
            order: item.finalState ? newOrder : newOrder + 1,
            id: `${item.target.state}_${item.finalState ? newOrder : newOrder + 1}`,
          },
        }
      })
    }

    const linksWithOrder = addOrderToStates(filteredLinks).map((l) => ({
      ...l,
      silhouette: trajectoryToSilhouetteMap.get(l.id) || "unknown",
    }))

    // console.log("links with Order:", linksWithOrder)
    // --- Step 2: Calculate the Partially Ordered Set (Poset) ---

    const temporal_states = silhouettes.map((s) => ({
      name: s.name,
      timed_states: s.states.map((state, i) => `${state}_${i}`),
    }))

    const dominancePairs = flatten(temporal_states.map((s) => getDominancePairs(s.timed_states)))

    // const labels = [...new Set(dominancePairs.flat())]
    const { matrix, nodes } = po.domFromEdges(dominancePairs)
    const poset = po.createPoset(matrix, nodes)

    // --- Step 3: Generate Sankey links from the Poset's cover relations ---

    const coverRels = poset.getCoverRelations()
    const posetNodes = poset.elements.map((e) => ({ id: e }))

    // OPTIMIZATION: Group links by source/target ID for O(1) lookup.
    // This avoids a slow, nested .filter() operation below.
    const linksBySourceTargetMap = new Map()
    linksWithOrder.forEach((link) => {
      const key = `${link.source.id}->${link.target.id}`
      if (!linksBySourceTargetMap.has(key)) {
        linksBySourceTargetMap.set(key, [])
      }
      linksBySourceTargetMap.get(key).push(link)
    })

    // console.log("Links by Source-Target Map:", linksBySourceTargetMap)

    const linksWithValue = coverRels.map((c) => {
      // The key is flipped because the cover relation is reversed from the link direction.
      const key = `${c.target}->${c.source}`
      const linkSegments = linksBySourceTargetMap.get(key) || []

      return {
        source: c.target,
        target: c.source,
        segments: linkSegments,
        value: linkSegments.length,
      }
    })

    // console.log("Links with Value:", linksWithValue)

    // const linksNotEmpty = linksWithValue
    const linksNotEmpty = linksWithValue.filter((l) => l.value > 0)

    return { nodes: posetNodes, links: linksNotEmpty }
  }, [silhouettes, filteredLinks])
}

export function PartialOrderChart() {
  const { idealSilhouettes } = useData()
  const { completeSilhouettes, selectedSilhouettesData, filteredLinks } = useDerivedData()

  const silhouettesData =
    selectedSilhouettesData.length === 0 ? completeSilhouettes : selectedSilhouettesData

  // Use the custom hook to get memoized, processed data
  console.time("useSankeyData")
  const sankeyData = useSankeyData(silhouettesData, filteredLinks, idealSilhouettes)
  console.log(sankeyData)
  console.timeEnd("useSankeyData")

  return (
    <div className="chart-container">
      {sankeyData && sankeyData.nodes.length > 0 ? (
        <Sankey width={1000} height={500} data={sankeyData} />
      ) : (
        <div className="no-data-panel">
          <CircleAlert size={64} />
          <p>Not enough nodes for this chart! Try adjusting the Silhouettes selection</p>
        </div>
      )}
    </div>
  )
}
