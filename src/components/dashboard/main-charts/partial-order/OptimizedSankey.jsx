import { useState, useMemo } from "react"
import { sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey"
import { motion, AnimatePresence } from "motion/react"
import { Tooltip } from "../../../common/Tooltip/Tooltip"
import { groupBy, keys, union, xor } from "lodash"
import { romanize } from "../../../../utils/numberHelpers"
import { useViz } from "../../../../contexts/VizContext"
import { ArrowDownToDot, ArrowUpFromDot } from "lucide-react"
import { useFilters } from "../../../../contexts/FiltersContext"
import { useDebouncedState } from "hamo"

// --- Constants for better maintainability ---
const MARGIN_Y = 25
const MARGIN_X = 5
const NODE_WIDTH = 26
const NODE_PADDING = 15
const DEFAULT_TRANSITION = { duration: 0.3, ease: "easeInOut" }

function addPathOffset(path, offset = 0.001) {
  const pathParts = path.split(",")
  const lastNum = Number(pathParts.at(-1)) + offset
  pathParts[pathParts.length - 1] = lastNum
  return pathParts.join(",")
}

function getTargetSegments(node) {
  return node.targetLinks
    .map((link) => link.segments)
    .flat()
    .map((s) => s.id)
}

function getSourceSegments(node) {
  return node.sourceLinks
    .map((link) => link.segments)
    .flat()
    .map((s) => s.id)
}

// SVG icon: arrow pointing left with a vertical stop line on the right
// Represents "trace upstream / collapse left"
function UpstreamIcon({ size = 14 }) {
  const mid = size / 2
  return (
    <g pointerEvents="none">
      {/* Arrow shaft */}
      <line
        x1={size * 0.7}
        y1={mid}
        x2={size * 0.1}
        y2={mid}
        stroke="black"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <polyline
        points={`${size * 0.3},${mid - size * 0.2} ${size * 0.1},${mid} ${size * 0.3},${mid + size * 0.2}`}
        stroke="black"
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Stop line */}
      <line
        x1={size * 0.85}
        y1={size * 0.2}
        x2={size * 0.85}
        y2={size * 0.8}
        stroke="black"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  )
}

// SVG icon: vertical stop line on the left, arrow pointing right
// Represents "trace downstream / expand right"
function DownstreamIcon({ size = 14 }) {
  const mid = size / 2
  return (
    <g pointerEvents="none">
      {/* Stop line */}
      <line
        x1={size * 0.15}
        y1={size * 0.2}
        x2={size * 0.15}
        y2={size * 0.8}
        stroke="black"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Arrow shaft */}
      <line
        x1={size * 0.3}
        y1={mid}
        x2={size * 0.9}
        y2={mid}
        stroke="black"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <polyline
        points={`${size * 0.7},${mid - size * 0.2} ${size * 0.9},${mid} ${size * 0.7},${mid + size * 0.2}`}
        stroke="black"
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  )
}

function SelectionButton({ onClick, node, Icon, xOffset }) {
  const SIZE = 20
  return (
    <motion.g
      className="select"
      initial={{ x: xOffset, y: 0, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      style={{ cursor: "pointer" }}
      onClick={() => onClick(node)}
    >
      <motion.rect width={SIZE} height={SIZE} fill="white" rx={5} />
      <g transform={`translate(${(SIZE - 14) / 2}, ${(SIZE - 14) / 2})`}>
        <Icon size={14} />
      </g>
    </motion.g>
  )
}

// --- Sub-component for rendering a single Sankey Node ---
function SankeyNode({ node, selectedNode, setSelectedNode, onMouseEnter, onMouseLeave }) {
  const { palette } = useViz()
  const { selectedTrajectoriesIDs, setSelectedTrajectoriesIDs } = useFilters()

  const [name] = node.id.split("-")
  const nodeHeight = node.y1 - node.y0

  if (nodeHeight <= 0) return null

  const isSelected = selectedNode?.id === node.id

  function handleClickLeft() {
    const ids = getTargetSegments(node)

    setSelectedTrajectoriesIDs((prev) => union(prev, ids)) // additive
  }

  function handleClickRight() {
    const ids = getSourceSegments(node)
    setSelectedTrajectoriesIDs((prev) => union(prev, ids)) // additive
    //TODO Use array ops to make difference
  }

  function handleNodeClick() {
    if (isSelected) {
      setSelectedNode(null)
      setSelectedTrajectoriesIDs([]) // only full reset happens here
    } else {
      setSelectedNode(node)
    }
  }
  return (
    <motion.g
      key={node.id}
      onMouseEnter={() => onMouseEnter(node)}
      onMouseLeave={onMouseLeave}
      initial={{
        x: node.x0,
        y: node.y0,
      }}
      animate={{
        x: node.x0,
        y: node.y0,
      }}
    >
      <motion.rect
        animate={{
          fillOpacity: isSelected ? 1 : 0.5,

          height: nodeHeight,
          width: NODE_WIDTH,
          fill: palette[name],
          stroke: isSelected ? "white" : "black",
        }}
        whileHover={{ fillOpacity: 1, cursor: "pointer" }}
        onClick={handleNodeClick}
        transition={DEFAULT_TRANSITION}
        rx={1}
      />

      <AnimatePresence>
        {isSelected && (
          <motion.g
            initial={{ opacity: 0, y: nodeHeight / 2 - 10 }}
            animate={{ opacity: 1, y: nodeHeight / 2 - 10 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.targetLinks.length > 0 && (
              <SelectionButton
                onClick={handleClickLeft}
                node={node}
                Icon={UpstreamIcon}
                xOffset={-25}
              />
            )}
            {node.sourceLinks.length > 0 && (
              <SelectionButton
                onClick={handleClickRight}
                node={node}
                Icon={DownstreamIcon}
                xOffset={NODE_WIDTH + 5}
              />
            )}
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  )
}

function SankeyLink({ link, setHoveredLink, hoveredTrajectory }) {
  const { palette } = useViz()
  const { selectedTrajectoriesIDs } = useFilters() // ← single source of truth

  const linkGenerator = sankeyLinkHorizontal()
  const path = linkGenerator(link)
  const [state_S] = link.source.id.split("-")
  const [state_F] = link.target.id.split("-")

  // A link is highlighted if ANY of its segments are in the selected set
  const selectedSet = new Set(selectedTrajectoriesIDs)
  const isSelected =
    selectedTrajectoriesIDs.length === 0 // nothing selected → all neutral
      ? false
      : (link.segments?.some((seg) => selectedSet.has(seg.id)) ?? false)

  const fullLink = {
    ...link,
    source: { ...link.source, name: state_S, index: state_S },
    target: { ...link.target, name: state_F, index: state_F },
  }

  return (
    <>
      <linearGradient id={`grad-${state_S}-${state_F}`}>
        <motion.stop
          offset="0%"
          animate={{ stopColor: palette[state_S] }}
          transition={{ duration: 0.4 }}
        />
        <motion.stop
          offset="100%"
          animate={{ stopColor: palette[state_F] }}
          transition={{ duration: 0.4 }}
        />
      </linearGradient>
      <motion.path
        id={`link-${link.source.id}-${link.target.id}`}
        initial={{
          d: addPathOffset(path),
          strokeWidth: link.width,
          pathLength: 0,
          opacity:
            selectedTrajectoriesIDs.length === 0
              ? 0.4 // nothing selected: all neutral
              : isSelected
                ? 0.8 // part of selection: highlighted
                : 0.15, // not in selection: dimmed
        }}
        animate={{
          d: addPathOffset(path),
          strokeWidth: link.width,
          pathLength: 1,
          opacity:
            selectedTrajectoriesIDs.length === 0
              ? 0.4 // nothing selected: all neutral
              : isSelected
                ? 0.8 // part of selection: highlighted
                : 0.15, // not in selection: dimmed
        }}
        whileHover={{ opacity: 1 }}
        exit={{ pathLength: 0 }}
        transition={DEFAULT_TRANSITION}
        stroke={`url(#grad-${state_S}-${state_F})`}
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

  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredSilhouette, setHoveredSilhouette] = useState(null)
  const [hoveredLink, setHoveredLink] = useDebouncedState(null, 200)
  const [hoveredNode, setHoveredNode] = useDebouncedState(null, 200)

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

    const { nodes, links } = sankeyGenerator(data)

    // TODO Not ideal, find a better way to show smaller entities DO NOT HIDE THEM
    const visibleNodes = nodes.filter((n) => n.x1 - n.x0 > 1)
    const visibleLinks = links.filter((l) => l.width > 1)

    return { nodes: visibleNodes, links: visibleLinks }
  }, [data, width, height])

  const handleMouseLeave = () => {
    setHoveredLink(null)
    setHoveredSilhouette(null)
    setHoveredNode(null)
  }

  const handleNodeEnter = (node) => {
    setHoveredLink(null)
    setHoveredSilhouette(null)
    setHoveredNode(node)
  }
  const handleNodeLeave = () => {
    setHoveredNode(null)
  }

  const columns = keys(groupBy(nodes, "x0"))
    .map((x) => Number(x))
    .sort((a, b) => a - b)

  return (
    <>
      <div id="sankey-chart" className="svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={handleMouseLeave}
        >
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
                  hoveredLink={hoveredLink}
                  setHoveredLink={setHoveredLink}
                  hoveredTrajectory={hoveredSilhouette} // Dim links if a silhouette is hovered
                />
              ))}
            </AnimatePresence>
          </g>

          <g id="nodes">
            {nodes.map((node) => (
              <SankeyNode
                key={`node-${node.id}`}
                node={node}
                hoveredTrajectory={hoveredSilhouette} // Dim nodes if a silhouette is hovered
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                onMouseEnter={handleNodeEnter}
                onMouseLeave={handleNodeLeave}
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

      <Tooltip isVisible={hoveredLink || hoveredSilhouette || hoveredNode}>
        <AnimatePresence>
          {hoveredNode && (
            <div>
              <p>{hoveredNode.id.split("-")[0]}</p>
              <p>
                {" "}
                <ArrowUpFromDot size={10} style={{ transform: "rotate(90deg)" }} />{" "}
                {getSourceSegments(hoveredNode).length}
              </p>
              <p>
                <ArrowDownToDot size={10} style={{ transform: "rotate(-90deg)" }} />{" "}
                {getTargetSegments(hoveredNode).length}
              </p>
            </div>
          )}
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
    </>
  )
}
