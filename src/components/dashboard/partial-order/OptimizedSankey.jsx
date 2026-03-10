import { useState, useMemo } from "react"
import { sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey"
import { motion, AnimatePresence } from "motion/react"
import { Tooltip } from "../../common/Tooltip/Tooltip"
import { groupBy, keys } from "lodash"
import { romanize } from "../../../utils/numberHelpers"
import { useViz } from "../../../contexts/VizContext"
import { useData } from "../../../contexts/ProcessedDataContext"
import { ArrowDownToDot, ArrowUpFromDot } from "lucide-react"
import { useFilters } from "../../../contexts/FiltersContext"

// --- Constants for better maintainability ---
const MARGIN_Y = 25
const MARGIN_X = 5
const NODE_WIDTH = 26
const NODE_PADDING = 15
// const SILHOUETTE_HOVER_STROKE_WIDTH = 10
const DEFAULT_TRANSITION = { duration: 0.3, ease: "easeInOut" }

// --- Helper Function ---
// This function slightly adjusts the SVG path data to prevent rendering artifacts
// where paths with the same coordinates might overlap perfectly.
function addPathOffset(path, offset = 0.001) {
  const pathParts = path.split(",")
  const lastNum = Number(pathParts.at(-1)) + offset
  pathParts[pathParts.length - 1] = lastNum
  return pathParts.join(",")
}

// --- Sub-component for rendering a single Sankey Node ---
function SankeyNode({
  node,
  palette,
  hoveredTrajectory,
  setSelectedLinks,
  selectedNode,
  setSelectedNode,
  setSelectionDirection,
  setSelectedTrajectoriesIDs,
}) {
  const [index] = node.id.split("_")
  const nodeHeight = node.y1 - node.y0

  if (nodeHeight <= 0) {
    return null
  }

  function handleNodeClick(node) {
    if (selectedNode && selectedNode.id === node.id) {
      // Deselect if clicking the same node
      setSelectedNode(null)
      setSelectedLinks([])
      return
    }
    setSelectedNode(node)
  }

  const isSelected = selectedNode && selectedNode.id === node.id

  function handleClickLeft(node) {
    console.log("Node clicked:", node)
    // selectLeftIds(node)

    const data = traceUpstream(node)
    //console.log("All nodes to the left:", upstreamData.nodes)
    //console.log("All links to the left:", upstreamData.links)
    setSelectionDirection("left")
    const targetSegments = getTargetSegments(node)
    setSelectedTrajectoriesIDs(targetSegments)
    setSelectedLinks(data.links)
  }

  function getTargetSegments(node) {
    const targetSegments = node.targetLinks
      .map((link) => link.segments)
      .flat()
      .map((s) => s.id)
    return targetSegments
  }

  function handleClickRight(node) {
    //console.log("Node clicked:", node)
    // selectLeftIds(node)

    const data = traceDownstream(node)
    //console.log("All nodes to the left:", upstreamData.nodes)
    //console.log("All links to the left:", upstreamData.links)
    setSelectionDirection("right")
    const sourceSegments = getSourceSegments(node)
    console.log(sourceSegments)
    setSelectedTrajectoriesIDs(sourceSegments)
    setSelectedLinks(data.links)
  }

  function getSourceSegments(node) {
    const sourceSegments = node.sourceLinks
      .map((link) => link.segments)
      .flat()
      .map((s) => s.id)
    return sourceSegments
  }

  /**
   * Traces all upstream (left) nodes and links starting from a specific node.
   * @param {Object} startNode - The node to start the search from.
   * @returns {Object} An object containing Sets of visited nodes and links.
   */
  function traceUpstream(startNode) {
    console.time("Upstream")
    const visitedNodes = new Set()
    const visitedLinks = new Set()

    function traverse(node) {
      // 1. Mark this node as visited to avoid cycles/duplicates
      visitedNodes.add(node)

      // 2. If there are no more targetLinks, we've reached the "far left"
      if (!node.targetLinks || node.targetLinks.length === 0) {
        return
      }

      // 3. Iterate through links coming into this node (from the left)
      node.targetLinks.forEach((link) => {
        visitedLinks.add(link)

        // The 'source' of a targetLink is the node to its left
        const sourceNode = link.source

        // Only recurse if we haven't seen this node yet
        if (!visitedNodes.has(sourceNode)) {
          traverse(sourceNode)
        }
      })
    }

    traverse(startNode)

    console.timeEnd("Upstream")

    return {
      nodes: Array.from(visitedNodes),
      links: Array.from(visitedLinks),
    }
  }

  function traceDownstream(startNode) {
    console.time("Downstream")

    const visitedNodes = new Set()
    const visitedLinks = new Set()

    function traverse(node) {
      visitedNodes.add(node)

      if (!node.sourceLinks || node.sourceLinks.length === 0) {
        return
      }

      node.sourceLinks.forEach((link) => {
        visitedLinks.add(link)

        const targetNode = link.target

        if (!visitedNodes.has(targetNode)) {
          traverse(targetNode)
        }
      })
    }

    traverse(startNode)
    console.timeEnd("Downstream")

    return {
      nodes: Array.from(visitedNodes),
      links: Array.from(visitedLinks),
    }
  }

  function SelectionButton({ onClick, node, text, xOffset }) {
    const SIZE = 20
    return (
      <motion.g
        className="select"
        initial={{ x: xOffset, y: 0, scale: 1 }}
        whileHover={{ scale: 1.1 }}
      >
        <motion.rect
          width={SIZE}
          height={SIZE}
          fill={"white"}
          // stroke="black"
          rx={5}
          onClick={() => onClick(node)}
          style={{ cursor: "pointer" }}
        />
        <text
          x={SIZE / 2}
          y={12.5}
          fontSize={SIZE / 2}
          textAnchor="middle"
          pointerEvents="none"
          // userSelect="none"
        >
          {text}
        </text>
      </motion.g>
    )
  }

  return (
    <motion.g key={node.id}>
      <motion.rect
        initial={{ x: node.x0, y: node.y0, height: nodeHeight, width: NODE_WIDTH }}
        animate={{
          // fillOpacity: hoveredTrajectory ? 0.2 : 0.5,
          fillOpacity: isSelected ? 1 : 0.5,

          x: node.x0,
          y: node.y0,
          height: nodeHeight,
          width: NODE_WIDTH,
        }}
        // exit={{
        //   fillOpacity: 0,
        //   height: 0,
        //   width: 0,
        // }}
        whileHover={{ fillOpacity: 1, cursor: "pointer" }}
        onClick={() => handleNodeClick(node)}
        transition={DEFAULT_TRANSITION}
        stroke={isSelected ? "white" : "black"}
        fill={palette[index]}
        rx={1}
      />
      <motion.text
        initial={{
          fill: hoveredTrajectory ? "#FFFFFF" : "#000000",
          x: node.x0 + 6,
          y: node.y0 + 12,
          pointerEvents: "none",
          // userSelect: "none",
        }}
        animate={{
          fill: hoveredTrajectory ? "#FFFFFF" : "#000000",
          x: node.x0 + 8,
          y: node.y0 + 16,
          fontSize: 16,
        }}
        transition={DEFAULT_TRANSITION}
        fontSize={8}
      >
        {node.id.split("_")[0]}
      </motion.text>

      <AnimatePresence>
        {isSelected && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            duration={0.2}
            id="selection-buttons"
          >
            <g transform={`translate(${node.x0}, ${node.y0 + nodeHeight / 2 - 10})`}>
              {node.targetLinks.length > 0 && (
                <SelectionButton onClick={handleClickLeft} node={node} text={"<"} xOffset={-25} />
              )}

              {node.sourceLinks.length > 0 && (
                <SelectionButton
                  onClick={handleClickRight}
                  node={node}
                  text={">"}
                  xOffset={NODE_WIDTH + 5}
                />
              )}
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  )
}

// --- Sub-component for rendering a single Sankey Link background ---
function SankeyLink({
  link,
  palette,
  setHoveredLink,
  hoveredTrajectory,
  selectedLinks,
  selectionDirection,
}) {
  const { scales } = useData()
  const linkGenerator = sankeyLinkHorizontal()
  const path = linkGenerator(link)
  const [index_S] = link.source.id.split("_")
  const [index_F] = link.target.id.split("_")

  const isSelectedLeft = selectedLinks.map((s) => s.target.id).includes(link.target.id)
  const isSelectedRight = selectedLinks.map((s) => s.source.id).includes(link.source.id)

  const isSelected = selectionDirection === "left" ? isSelectedLeft : isSelectedRight

  const fullLink = {
    ...link,
    source: { ...link.source, name: scales.indexToName(index_S), index: index_S },
    target: { ...link.target, name: scales.indexToName(index_F), index: index_F },
  }

  return (
    <>
      <linearGradient key={`grad-${link.id}`} id={`grad-${index_S}-${index_F}`}>
        <stop offset="0%" stopColor={palette[index_S]} />
        <stop offset="100%" stopColor={palette[index_F]} />
      </linearGradient>
      <motion.path
        key={`link-${link.source.id}-${link.target.id}`}
        id={`link-${link.source.id}-${link.target.id}`}
        initial={{
          d: addPathOffset(path),
          pathLength: 0,
          strokeOpacity: 0.5,
          strokeWidth: link.width,
        }}
        animate={{
          d: addPathOffset(path),
          strokeWidth: link.width,
          pathLength: 1,
          // opacity: hoveredTrajectory ? 0.2 : 0.5,
          opacity: isSelected ? 0.8 : 0.4,
        }}
        whileHover={{ opacity: 1 }}
        exit={{ pathLength: 0, strokeOpacity: 0.5 }}
        transition={DEFAULT_TRANSITION}
        stroke={`url(#grad-${index_S}-${index_F})`}
        fill="none"
        onMouseEnter={() => setHoveredLink(fullLink)}
      />
    </>
  )
}

// --- Main Sankey Component ---
export function Sankey({ width, height, data }) {
  const { palette } = useViz()
  const { setSelectedTrajectoriesIDs } = useFilters()

  console.log("Sankey")

  const [hoveredLink, setHoveredLink] = useState(null)
  const [selectedLinks, setSelectedLinks] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectionDirection, setSelectionDirection] = useState("right") // "left" or "right"
  const [hoveredSilhouette, setHoveredSilhouette] = useState(null)

  // OPTIMIZATION: Memoize the expensive Sankey layout calculation.
  // This ensures the layout is only re-calculated when data, width, or height change,
  // not on every re-render (e.g., when hovering).
  const { nodes, links } = useMemo(() => {
    const sankeyGenerator = sankey()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [MARGIN_X, MARGIN_Y],
        [width - MARGIN_X, height - MARGIN_Y],
      ])
      .nodeId((node) => node.id)
      .nodeAlign(sankeyCenter)
    return sankeyGenerator(data)
  }, [data, width, height])

  //console.log(links)

  const handleMouseLeave = () => {
    setHoveredLink(null)
    setHoveredSilhouette(null)
  }

  // const f = performance.now()
  //console.log(`Sankey Layout Computation Finished in ${f - i} ms`)

  const columns = keys(groupBy(nodes, "x0"))
    .map((x) => Number(x))
    .sort((a, b) => a - b)

  return (
    <div className="chart-container">
      <div id="sankey-chart" className="svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {links.map((link) => {
              const [index_S] = link.source.id.split("_")
              const [index_F] = link.target.id.split("_")
              return (
                <linearGradient key={`grad-def-${link.index}`} id={`grad-${index_S}-${index_F}`}>
                  <stop offset="0%" stopColor={palette[index_S]} />
                  <stop offset="100%" stopColor={palette[index_F]} />
                </linearGradient>
              )
            })}
          </defs>

          <g id="sankey-grid">
            {columns.map((x, i) => (
              <text
                key={x}
                x={Number(x) + NODE_WIDTH / 2}
                y={12}
                fill="white"
                dominantBaseline="middle"
                textAnchor="middle"
              >
                {romanize(i + 1)}
              </text>
            ))}
          </g>

          <g id="links-background">
            <AnimatePresence>
              {links.map((link) => (
                <SankeyLink
                  key={`link-bg-${link.source.id}-${link.target.id}`}
                  link={link}
                  palette={palette}
                  hoveredLink={hoveredLink}
                  setHoveredLink={setHoveredLink}
                  hoveredTrajectory={hoveredSilhouette} // Dim links if a silhouette is hovered
                  selectedLinks={selectedLinks}
                  selectionDirection={selectionDirection}
                />
              ))}
            </AnimatePresence>
          </g>

          <g id="nodes">
            {nodes.map((node) => (
              <SankeyNode
                key={`node-${node.id}`}
                node={node}
                palette={palette}
                hoveredTrajectory={hoveredSilhouette} // Dim nodes if a silhouette is hovered
                setSelectedLinks={setSelectedLinks}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                setSelectionDirection={setSelectionDirection}
                setSelectedTrajectoriesIDs={setSelectedTrajectoriesIDs}
              />
            ))}
          </g>
          {/* 
          <g id="silhouette-links" onMouseLeave={() => setHoveredSilhouette(null)}>
            {links.map((link) => (
              <SilhouetteGroup
                key={`sil-group-${link.index}`}
                link={link}
                palette={palette}
                hoveredSilhouette={hoveredSilhouette}
                setHoveredSilhouette={setHoveredSilhouette}
                toggleSilhouetteFilter={toggleSilhouetteFilter}
                hoveredLink={hoveredLink}
              />
            ))}
          </g> */}
        </svg>
      </div>

      <Tooltip isVisible={hoveredLink || hoveredSilhouette}>
        <AnimatePresence>
          {hoveredLink && !hoveredSilhouette && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p>
                <ArrowUpFromDot size={10} style={{ transform: "rotate(90deg)" }} />{" "}
                <span style={{ color: palette[hoveredLink.source.index] }}>
                  {hoveredLink.source.name}
                </span>{" "}
                at <span>{hoveredLink.source.depth + 1}</span>
              </p>
              <p>
                <ArrowDownToDot size={10} style={{ transform: "rotate(-90deg)" }} />{" "}
                <span style={{ color: palette[hoveredLink.target.index] }}>
                  {hoveredLink.target.name}
                </span>{" "}
                at <span>{hoveredLink.target.depth + 1}</span>
              </p>
              <p>
                <span className="bold">{hoveredLink.value}</span> IDs
              </p>
            </motion.div>
          )}
          {hoveredSilhouette && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p>Silhouette ID: {hoveredSilhouette.id}</p>
              <p>FINNGEN IDs: {hoveredSilhouette.size}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Tooltip>
    </div>
  )
}
