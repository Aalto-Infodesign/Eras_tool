import { useState, useContext } from "react"
import { TrajectoriesContext } from "../../TrajectoriesContext"
import { linkHorizontal } from "d3"
import { sankey, sankeyCenter, sankeyLinkHorizontal } from "d3-sankey"
import { motion, AnimatePresence, stagger } from "motion/react"
import { Tooltip } from "../../../common/Tooltip/Tooltip"
import { flatten, groupBy } from "lodash"
const MARGIN_Y = 25
const MARGIN_X = 5
const NODE_WIDTH = 26

export function Sankey({ width, height, data }) {
  const poContext = useContext(TrajectoriesContext)
  const {
    palette,
    selectedTrajectoriesIDs,
    toggleSelectedTrajectory,
    selectedSilhouettes,
    toggleSilhouetteFilter,
    toggle,
  } = poContext

  const [hoveredLink, setHoveredLink] = useState(null)
  const [hoveredTrajectory, setHoveredTrajectory] = useState(null)
  const [hoveredSilhouette, setHoveredSilhouette] = useState(null)

  const defaultTransition = { duration: 0.3, ease: "easeInOut" }

  console.log("sankeyData: ", data)
  const sankeyGenerator = sankey() // Main function of the d3-sankey plugin that computes the layout
    .nodeWidth(NODE_WIDTH) // width of the node in pixels
    .nodePadding(15) // space between nodes
    .extent([
      // chart area:
      [MARGIN_X, MARGIN_Y], // top-left coordinates
      [width - MARGIN_X, height - MARGIN_Y], // botton-right coordinates
    ])
    .nodeId((node) => node.id) // Accessor function: how to retrieve the id that defines each node. This id is then used for the source and target props of links
    .nodeAlign(sankeyCenter) // Algorithm used to decide node position

  const { nodes, links } = sankeyGenerator(data)

  console.log("nodes", nodes)
  console.log("links", links)

  const linksSegments = flatten(links.map((l) => l.segments))
  console.log("linksSegments", linksSegments)

  const allNodes = nodes.map((node) => {
    const [index, step] = node.id.split("_")
    const nodeHeight = node.y1 - node.y0
    return (
      <motion.g
        key={node.id} // The key is crucial for AnimatePresence to track the element.
      >
        {nodeHeight > 0 && (
          <motion.rect
            key={"rect-" + node.id}
            initial={{
              x: node.x0,
              y: node.y0,
              height: nodeHeight,
              width: sankeyGenerator.nodeWidth(),
            }}
            animate={{
              fillOpacity: hoveredTrajectory ? 0.2 : 0.5,
              x: node.x0,
              y: node.y0,
              height: nodeHeight,
              width: sankeyGenerator.nodeWidth(),
            }}
            transition={defaultTransition}
            stroke={"black"}
            fill={palette[index]}
            rx={1}
          />
        )}
        {nodeHeight > 0 && (
          <motion.text
            key={"label-" + node.id}
            initial={{
              fill: hoveredTrajectory ? "#FFFFFF" : "#000000",
              x: node.x0 + 6,
              y: node.y0 + 12,
            }}
            animate={{
              fill: hoveredTrajectory ? "#FFFFFF" : "#000000",
              x: node.x0 + 6,
              y: node.y0 + 12,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            fontSize={8}
          >
            {node.id}
          </motion.text>
        )}
      </motion.g>
    )
  })

  const allLinks = links.map((link, i) => {
    const linkGenerator = sankeyLinkHorizontal()
    const path = linkGenerator(link)

    const [index_S, step_S] = link.source.id.split("_")
    const [index_F, step_F] = link.target.id.split("_")

    return (
      <motion.path
        key={`link-${link.source.id}-${link.target.id}`}
        id={`link-${link.source.id}-${link.target.id}`}
        initial={{
          pathLength: 0,
          strokeOpacity: 0.5,
          d: addPathOffset(path),
          strokeWidth: link.width,
        }}
        animate={{
          d: addPathOffset(path),
          strokeWidth: link.width,
          pathLength: 1,
          opacity: hoveredTrajectory ? 0.2 : 0.5,
        }}
        exit={{ pathLength: 0, strokeOpacity: 0.5, d: addPathOffset(path) }}
        transition={defaultTransition}
        stroke={`url(#grad-${index_S}-${index_F})`}
        fill="none"
        whileHover={{ strokeOpacity: 0.2, transition: { duration: 0.2 } }}
        onMouseEnter={() => setHoveredLink(link)}
        // onMouseLeave={() => setHoveredLink(null)}
      />
    )
  })

  const allGradients = links.map((link, i) => {
    const [index_S, step_S] = link.source.id.split("_")
    const [index_F, step_F] = link.target.id.split("_")
    return (
      <linearGradient key={i} id={`grad-${index_S}-${index_F}`}>
        <stop offset="0%" stopColor={palette[index_S]} />
        <stop offset="100%" stopColor={palette[index_F]} />
      </linearGradient>
    )
  })

  // TODO Raggruppare non per singoli LINKS ma per overall SILHOUETTES PESATE

  // --- 3. RENDER INDIVIDUAL SEGMENTS (TRAJECTORIES) ---
  const allTrajectories = []
  const linkGenerator = sankeyLinkHorizontal()
  const allTrajectoriesBridges = []
  const bridgeGenerator = linkHorizontal()

  const allSyntheticLinks = []

  const padding = 0
  links.forEach((link) => {
    // Check if the link has segments and its width is positive
    if (!link.segments || link.segments.length === 0 || link.width <= 0) {
      return
    }

    // Calculate the height of each individual segment's path
    const numSegments = link.segments.length
    const segmentHeight = 4

    const totalSegmentsHeight = numSegments * segmentHeight
    const totalGapSpace = link.width - totalSegmentsHeight

    const segmentGap = Math.max(0, totalGapSpace / (numSegments + 1))
    const linkSourceTop = link.y0 - link.width / 2
    const linkTargetTop = link.y1 - link.width / 2
    // const segmentGap =
    //   (link.width - padding - link.segments.length * segmentHeight) / (link.segments.length + 1)
    const [index_S, step_S] = link.source.id.split("_")
    // const [index_F, step_F] = link.target.id.split("_")

    // Create a path for each segment
    link.segments.forEach((segment, i) => {
      const segmentTopOffset = segmentGap + i * (segmentHeight + segmentGap)

      const syntheticLink = {
        id: link.id,
        source: link.source,
        target: link.target,
        width: segmentHeight,
        // The y-position is offset by the segment's index
        y0: linkSourceTop + segmentTopOffset + segmentHeight / 2,
        y1: linkTargetTop + segmentTopOffset + segmentHeight / 2,
      }

      allSyntheticLinks.push(syntheticLink)

      const path = linkGenerator(syntheticLink)

      const isSameHoveredLink =
        hoveredLink &&
        link.source.id === hoveredLink.source.id &&
        link.target.id === hoveredLink.target.id

      const isHovered = hoveredTrajectory && segment.id === hoveredTrajectory.id
      const isSelected = selectedTrajectoriesIDs.includes(segment.id)

      const isVisible = isSameHoveredLink || isHovered || isSelected
      const strokeOpacityValue = isHovered || isSelected ? 1 : 0.5

      allTrajectories.push(
        <AnimatePresence>
          {isVisible && (
            <motion.path
              key={`traj-${segment.id}-${link.source.id}-${link.target.id}`}
              id={`traj-${segment.id}-${link.source.id}-${link.target.id}`}
              whileHover={{ cursor: "pointer" }}
              whileTap={{ strokeWidth: 10 * 1.3 }}
              initial={{
                pathLength: 0,
                strokeOpacity: 0,
                strokeWidth: isHovered ? 10 : segmentHeight,
              }}
              animate={{
                pathLength: 1,
                strokeOpacity: strokeOpacityValue,
                strokeWidth: isHovered ? 10 : segmentHeight,
              }}
              transition={{
                default: { duration: 0.3, delay: 0.01 * i, ease: "easeInOut" },
                strokeWidth: { duration: 0.1 },
                strokeOpacity: { duration: 0.25 },
              }}
              exit={{ pathLength: 0 }}
              d={addPathOffset(path)}
              fill="none"
              // stroke={`url(#grad-${index_S}-${index_F})`}
              stroke={palette[index_S]}
              strokeWidth={segmentHeight}
              onMouseEnter={() => setHoveredTrajectory({ id: segment.id, link: link })} // Optional hover
              onMouseLeave={() => setHoveredTrajectory(null)} // Optional hover
              onClick={() => toggleSelectedTrajectory(segment.id)}
            />
          )}
        </AnimatePresence>,
      )

      // TODO: Create segments to connect the trajectories between states
      // --- 2. New code to create the bridge path ---
      // Only draw a bridge if this is NOT the last segment

      // The X position is the right edge of the source node
      const bridgeX = link.source.x1
      const bridgeX2 = link.source.x1 - NODE_WIDTH

      // The bridge starts at the bottom of the current segment
      const bridgeSourceY = syntheticLink.y0 + segmentHeight

      // It ends at the top of the *next* segment
      const bridgeTargetY =
        link.y0 - link.width / 2 + (i + 1) * segmentHeight + segmentGap * (i + 1) + padding

      // Create a synthetic object for the bridge path generator
      const syntheticBridge = {
        source: [bridgeX, bridgeSourceY],
        target: [bridgeX2, bridgeTargetY],
      }

      const bridgePath = bridgeGenerator(syntheticBridge)

      allTrajectoriesBridges.push(
        <path
          key={`bridge-${link.index}-${i}`}
          d={bridgePath}
          fill="none"
          stroke={`white`}
          strokeWidth={segmentHeight}
        />,
      )
    })
  })

  const segmentsBySelectedIDs = flatten(
    links.map((l) => l.segments.filter((s) => selectedTrajectoriesIDs.includes(s.id))),
  )

  const allSilhouettes = []
  const silhouetteLinkGenerator = sankeyLinkHorizontal()

  links.forEach((link) => {
    // Check if the link has segments and its width is positive
    if (!link.segments || link.segments.length === 0 || link.width <= 0) {
      return
    }

    console.log("link.segments", link.segments)
    const segmentsBySilhouette = Object.entries(groupBy(link.segments, "silhouette")).map((s) => ({
      id: s[0],
      value: s[1],
    }))

    console.log("segmentsBySilhouette", segmentsBySilhouette)

    // Calculate the height of each individual segment's path
    const numSegments = segmentsBySilhouette.length
    const segmentHeight = 4

    const totalSegmentsHeight = numSegments * segmentHeight
    const totalGapSpace = link.width - totalSegmentsHeight

    const segmentGap = Math.max(0, totalGapSpace / (numSegments + 1))
    const linkSourceTop = link.y0 - link.width / 2
    const linkTargetTop = link.y1 - link.width / 2
    // const segmentGap =
    //   (link.width - padding - link.segments.length * segmentHeight) / (link.segments.length + 1)
    const [index_S, step_S] = link.source.id.split("_")
    // const [index_F, step_F] = link.target.id.split("_")

    // Create a path for each segment
    segmentsBySilhouette.forEach((segment, i) => {
      const segmentTopOffset = segmentGap + i * (segmentHeight + segmentGap)

      const syntheticLink = {
        id: link.id,
        source: link.source,
        target: link.target,
        width: segment.value.length,
        // The y-position is offset by the segment's index
        y0: linkSourceTop + segmentTopOffset + segmentHeight / 2,
        y1: linkTargetTop + segmentTopOffset + segmentHeight / 2,
      }

      // allSyntheticLinks.push(syntheticLink)

      const path = linkGenerator(syntheticLink)

      const isSameHoveredLink =
        hoveredLink &&
        link.source.id === hoveredLink.source.id &&
        link.target.id === hoveredLink.target.id

      const isHovered = hoveredSilhouette && segment.id === hoveredSilhouette.id
      const isSelected = selectedTrajectoriesIDs.includes(segment.id)

      const isVisible = isSameHoveredLink || isHovered || isSelected
      const strokeOpacityValue = isHovered || isSelected ? 1 : 0.5

      allSilhouettes.push(
        <AnimatePresence>
          {isVisible && (
            <motion.path
              key={`sil-${segment.id}-${link.source.id}-${link.target.id}`}
              id={`sil-${segment.id}-${link.source.id}-${link.target.id}`}
              whileHover={{ cursor: "pointer" }}
              whileTap={{ strokeWidth: 10 * 1.3 }}
              initial={{
                pathLength: 0,
                strokeOpacity: 0,
                strokeWidth: isHovered ? 10 : segmentHeight,
              }}
              animate={{
                pathLength: 1,
                strokeOpacity: strokeOpacityValue,
                strokeWidth: isHovered ? 10 : segmentHeight,
              }}
              transition={{
                default: { duration: 0.3, delay: 0.01 * i, ease: "easeInOut" },
                strokeWidth: { duration: 0.1 },
                strokeOpacity: { duration: 0.25 },
              }}
              exit={{ pathLength: 0 }}
              d={addPathOffset(path)}
              fill="none"
              // stroke={`url(#grad-${index_S}-${index_F})`}
              stroke={palette[index_S]}
              strokeWidth={segmentHeight}
              onMouseEnter={() => setHoveredSilhouette({ id: segment.id, link: link })} // Optional hover
              onMouseLeave={() => setHoveredSilhouette(null)} // Optional hover
              onClick={() => toggleSilhouetteFilter(segment.id)}
            />
          )}
        </AnimatePresence>,
      )
    })
  })

  // console.log("Selected Segments", segmentsBySelectedIDs)

  // const connectorPathObjects = createConnectorPaths(allSyntheticLinks)

  return (
    <div>
      {/* <h3>Sankey</h3> */}
      <div className="chart-container">
        <div className="svg-container">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            onMouseEnter={() => {
              setHoveredLink(null)
              setHoveredTrajectory(null)
            }}
            onMouseLeave={() => {
              setHoveredLink(null)
              setHoveredTrajectory(null)
            }}
          >
            <defs>{allGradients}</defs>
            <g id="nodes">
              <AnimatePresence>{allNodes}</AnimatePresence>
            </g>
            <g id="links">
              <AnimatePresence>{allLinks}</AnimatePresence>
            </g>
            <g id="silhouette-links">{allSilhouettes}</g>

            <g id="legend">
              <rect color="white" width={100} height={100} x={100} y1={100} />
            </g>
            {/* <g id="trajectories">{allTrajectories}</g> */}
            {/* <g id="bridges">
              {connectorPathObjects.map((connector, index) => (
                <path
                  key={`connector-${index}`}
                  d={connector.path}
                  // You can style the connector based on the flow, e.g., using the same color
                  fill="rgba(255, 255, 255, 0.5)"
                  stroke="none"
                />
              ))}
            </g> */}
            {/* <g id="bridges">{allTrajectoriesBridges}</g> */}
          </svg>
        </div>
      </div>
      <Tooltip isVisible={(hoveredLink && !hoveredTrajectory) || hoveredTrajectory}>
        <AnimatePresence>
          {hoveredLink && !hoveredTrajectory && (
            <div>
              <p>
                Link {hoveredLink.source.id} to {hoveredLink.target.id}
              </p>
              <p>
                N. Segments: <span>{hoveredLink.value}</span>
              </p>
            </div>
          )}
          {hoveredTrajectory && (
            <div>
              <p>ID: {hoveredTrajectory.id}</p>
              {/* <p>Source: {hoveredTrajectory.link.source.id}</p>
              <p>Target: {hoveredTrajectory.link.target.id}</p> */}
            </div>
          )}
        </AnimatePresence>
      </Tooltip>
    </div>
  )
}

// --- The Custom Link Drawer ---
function straightLink(link, offset = 0.1) {
  const startX = link.source.x1 // End of the source node
  const startY = link.y0 // Top of the link at the source
  const endX = link.target.x0 // Start of the target node
  const endY = link.y1 + offset // Top of the link at the target

  // Use a path data string:
  // M = move to
  // L = line to
  return `M${startX},${startY} L${endX},${endY}`
}

function addPathOffset(path, offset = 0.001) {
  const pathParts = path.split(",")
  const lastNum = Number(pathParts.at(-1)) + offset

  pathParts[pathParts.length - 1] = lastNum

  return pathParts.join(",")
}

/**
 * Creates SVG path strings for the connectors between sequential Sankey links.
 *
 * @param {Array<Object>} syntheticLinks - An array of link objects, each with
 * source, target, width, y0, and y1 properties. MUST be sorted in flow order.
 * @returns {Array<string>} An array of SVG path strings for the connectors.
 */
function createConnectorPaths(syntheticLinks) {
  const connectorPaths = []

  // Loop through to connect link[i] with link[i+1]
  for (let i = 0; i < syntheticLinks.length - 1; i++) {
    const prevLink = syntheticLinks[i]
    const nextLink = syntheticLinks[i + 1]

    // Ensure we are connecting links at the same node
    // The x-position of the target of the previous link must be the same as the
    // x-position of the source of the next link.
    if (prevLink.target.x !== nextLink.source.x) {
      // These links are not sequential at the same node, so skip.
      continue
    }

    const x = prevLink.target.x // The x-position of the connection node

    // Calculate the y-coordinates for the top and bottom of each link's end.
    // y_top = y_center - (width / 2)
    // y_bottom = y_center + (width / 2)
    const prev_y_top = prevLink.y1 - prevLink.width / 2
    const prev_y_bottom = prevLink.y1 + prevLink.width / 2

    const next_y_top = nextLink.y0 - nextLink.width / 2
    const next_y_bottom = nextLink.y0 + nextLink.width / 2

    // Define the 4 corners of the connecting trapezoid
    const p1 = { x: x, y: prev_y_top } // Top-right of previous link
    const p2 = { x: x, y: prev_y_bottom } // Bottom-right of previous link
    const p3 = { x: x, y: next_y_bottom } // Bottom-left of next link
    const p4 = { x: x, y: next_y_top } // Top-left of next link

    // Create the SVG path string
    const pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`

    // It's often useful to return an object with more info
    connectorPaths.push({
      id: `${prevLink.id}-connector`,
      path: pathData,
      sourceLink: prevLink,
      targetLink: nextLink,
    })
  }

  return connectorPaths
}
