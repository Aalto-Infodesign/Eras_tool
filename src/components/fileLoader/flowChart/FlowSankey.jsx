import { useEffect, useMemo, useState } from "react"
import { sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey"
import { motion } from "motion/react"
import { useData } from "../../../contexts/ProcessedDataContext"
import { useViz } from "../../../contexts/VizContext"

const MARGIN_Y = 15
const MARGIN_X = 10

export const Sankey = ({ width, height, data }) => {
  const { idealSilhouettes, setIdealSilhouettes } = useData()
  const { palette } = useViz()
  const [hoveredNode, setHoveredNode] = useState(null)

  // console.log("Sankey data", data)
  // Use useMemo to stabilize the 'nodes' and 'links' references
  const { nodes, links } = useMemo(() => {
    const dataForSankey = {
      nodes: data.nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        index: node.data.index,
        trueIndex: Number(node.data.index),
        color: palette[node.data.index] || node.data.color,
        category: node.data.category,
      })),
      links: data.links.map((link) => ({
        source: link.source,
        target: link.target,
        value: 1,
      })),
    }

    const sankeyGenerator = sankey()
      .nodeWidth(Math.min(25, width / 10))
      .nodePadding(20)
      .extent([
        [MARGIN_X, 0],
        [width - MARGIN_X, height],
      ])
      .nodeId((node) => node.id)
      .nodeAlign(sankeyCenter)

    try {
      const result = sankeyGenerator(dataForSankey)
      return { nodes: result.nodes, links: result.links }
    } catch (error) {
      console.error("Sankey Generation Failed:", error.message)
      return { nodes: [], links: [] }
    }
  }, [data, width, height, palette]) // Only recalculates if these change

  //   console.log("Sankey nodes:", nodes)
  useEffect(() => {
    if (!nodes?.length || !links?.length) return

    const allCombinations = getSankeyPathArrays(nodes, links)
    const silhouettesStrings = allCombinations.map((c) => c.join("-"))
    const currentHash = silhouettesStrings.join("|")
    const prevHash = idealSilhouettes.join("|")

    if (currentHash !== prevHash) setIdealSilhouettes(silhouettesStrings)
  }, [nodes, links])

  const allNodes = nodes.map((node) => {
    const isHovered = hoveredNode && hoveredNode.id === node.id
    return (
      <motion.g
        key={node.index}
        onHoverStart={() => (setHoveredNode(node), console.log(node))}
        onHoverEnd={() => setHoveredNode(null)}
      >
        <motion.rect
          // initial={{ height: 0 }}
          // animate={{ height: node.y1 - node.y0 }}
          // exit={{ height: 0 }}
          height={node.y1 - node.y0}
          width={20}
          x={node.x0}
          y={node.y0}
          whileHover={{ scale: 0.95 }}
          strokeWidth={0}
          stroke={"black"}
          fill={node.color}
          fillOpacity={0.8}
          rx={1}
        />
      </motion.g>
    )
  })

  const allLinks = links.map((link, i) => {
    const linkGenerator = sankeyLinkHorizontal()
    const path = linkGenerator(link)

    return (
      <path
        key={i}
        d={path}
        transform="translate(-2.5,0)" // There is a wierd 2px offset issue in d3-sankey
        stroke="#ffffff"
        fill="none"
        strokeOpacity={0.1}
        strokeWidth={link.width}
      />
    )
  })
  return (
    <div className="flex-sankey-wrapper">
      <svg width={width} height={height}>
        {/* Sankey diagram rendering logic goes here */}
        <g className="sankey-nodes">{allNodes}</g>
        <g className="sankey-links">{allLinks}</g>
      </svg>
      {/* <Tooltip isVisible={hoveredNode}>{hoveredNode && <div>{hoveredNode.name}</div>}</Tooltip> */}
    </div>
  )
}

function notifyUser(message) {
  // Example: alert(message);
  // Or: setErrorState(message);
  console.warn("User Notification:", message)
  alert(message)
}

/**
 * Extracts all full paths from source to sink as arrays of labels.
 * @param {Array} nodes - Array of node objects
 * @param {Array} links - Array of link objects
 * @returns {Array<String[]>} - e.g., [["Energy", "Electricity"], ["Energy", "Heating"]]
 */
function getSankeyPathArrays(nodes, links) {
  const allPaths = []

  // 1. Build Adjacency List
  const adj = new Map()
  const hasIncoming = new Set()

  links.forEach((link) => {
    // Handle both index-based and object-based links (common in D3)
    const sIdx = typeof link.source === "object" ? link.source.index : link.source
    const tIdx = typeof link.target === "object" ? link.target.index : link.target

    if (!adj.has(sIdx)) adj.set(sIdx, [])
    adj.get(sIdx).push(tIdx)
    hasIncoming.add(tIdx)
  })

  // 2. Find Root Nodes (Nodes that are never targets)
  const roots = nodes.map((_, index) => index).filter((index) => !hasIncoming.has(index))

  // 3. Recursive DFS Traversal
  function traverse(nodeIdx, currentPath) {
    const node = nodes[nodeIdx]
    const index = node.trueIndex

    // Create a new array for this branch to avoid reference issues
    const newPath = [...currentPath, index]

    // Check if it's a Sink (no outgoing links)
    if (!adj.has(nodeIdx) || adj.get(nodeIdx).length === 0) {
      allPaths.push(newPath)
      return
    }

    // Continue to next nodes
    adj.get(nodeIdx).forEach((nextIdx) => {
      traverse(nextIdx, newPath)
    })
  }

  // Start the engine
  roots.forEach((rootIdx) => traverse(rootIdx, []))

  return allPaths
}
