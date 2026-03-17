import { useMemo, useState } from "react"
import { sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey"
import { motion } from "motion/react"
import { useViz } from "../../../contexts/VizContext"
import { useEdges, useNodes } from "@xyflow/react"
import { Tooltip } from "../../common/Tooltip/Tooltip"

const MARGIN_X = 10

export const Sankey = ({ width, height }) => {
  const nodes = useNodes()
  const edges = useEdges()
  const { palette } = useViz()
  const [hoveredNode, setHoveredNode] = useState(null)

  const { sankeyNodes, sankeyLinks } = useMemo(() => {
    if (!nodes || edges.length === 0) return { sankeyNodes: [], sankeyLinks: [] }

    const usedNodeIds = new Set(edges.flatMap((e) => [e.source, e.target]))

    const dataForSankey = {
      sankeyNodes: nodes
        .filter((node) => usedNodeIds.has(node.id))
        .map((node) => ({
          id: node.id,
          name: node.data.value,
          dataIndex: node.data.index,
          color: palette[node.data.value],
          category: node.data.category,
        })),
      sankeyLinks: edges.map((link) => ({
        source: link.source,
        target: link.target,
        value: 1,
      })),
    }

    const sankeyGenerator = sankey()
      .nodeWidth(Math.min(25, width / 10))
      .nodePadding(10)
      .extent([
        [MARGIN_X, 0],
        [width - MARGIN_X, height],
      ])
      .nodeId((node) => node.id)
      .nodeAlign(sankeyCenter)

    try {
      const result = sankeyGenerator({
        nodes: dataForSankey.sankeyNodes,
        links: dataForSankey.sankeyLinks,
      })
      return { sankeyNodes: result.nodes, sankeyLinks: result.links }
    } catch (error) {
      console.error("Sankey Generation Failed:", error.message)
      return { sankeyNodes: [], sankeyLinks: [] }
    }
  }, [nodes, edges, width, height, palette]) // Only recalculates if these change

  if (sankeyNodes.length === 0 || sankeyLinks.length === 0) return

  const allNodes = sankeyNodes.map((node) => {
    // const isHovered = hoveredNode && hoveredNode.id === node.id

    return (
      <motion.g
        key={node.id}
        onHoverStart={() => (setHoveredNode(node), console.log(node))}
        onHoverEnd={() => setHoveredNode(null)}
        initial={{ x: node.x0, y: node.y0, opacity: 0 }}
        animate={{ x: node.x0, y: node.y0, opacity: 1 }}
        exit={{ x: node.x0, y: node.y0, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <motion.rect
          initial={{ height: 0, fill: node.color }}
          animate={{ height: node.y1 - node.y0, fill: node.color }}
          transition={{ duration: 0.2 }}
          exit={{ height: 0 }}
          width={20}
          whileHover={{ scale: 0.95 }}
          strokeWidth={0}
          stroke={"black"}
          // fill={node.color}
          fillOpacity={0.8}
          rx={1}
        />
      </motion.g>
    )
  })

  const allLinks = sankeyLinks.map((link, i) => {
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
      {edges.length > 0 && (
        <svg width={width} height={height}>
          {/* Sankey diagram rendering logic goes here */}
          <g className="sankey-nodes">{allNodes}</g>
          <g className="sankey-links">{allLinks}</g>
        </svg>
      )}
      <Tooltip isVisible={hoveredNode}>{hoveredNode && <div>{hoveredNode.name}</div>}</Tooltip>
    </div>
  )
}
