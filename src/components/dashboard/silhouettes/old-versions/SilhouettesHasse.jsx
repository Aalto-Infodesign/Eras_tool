import { po } from "../../../../utils/po"
import { AnimatePresence, motion, useAnimate } from "framer-motion"
import { useRef, useState, useMemo } from "react"
import { scaleLinear, scalePoint } from "d3"

import { flattenDeep, groupBy } from "lodash"

// Removed unused import: zip, useTimeout, UMAP, use

import { SilhouettePathSvg } from "./silhouettes"

const centerParentNodes = (parentName, poset) => {
  const children = poset.getCovering(parentName)
  if (!children || children.length === 0) return 0
  const childPositions = children.map((child) => poset.features[child].xPosition)
  return (Math.min(...childPositions) + Math.max(...childPositions)) / 2
}

// --- Custom Hook for Heavy Computations (Refactored) ---
const usePosetLayout = (
  silhouettes,
  width,
  height,
  nodeRadius,
  padding,
  statesNamesLoaded,
  hoveredNode
) => {
  // Step 1: Memoize the expensive poset creation.
  // This only re-runs if the underlying silhouette data changes.
  const basePosetData = useMemo(() => {
    if (!silhouettes || silhouettes.length === 0 || !statesNamesLoaded) {
      return { poset: null, covers: [], leaves: [], orderedLeaves: [] }
    }

    const silhouetteNames = silhouettes.map((s) => s.name)
    console.log("Silhouette Names:", silhouetteNames)
    const dominancePairs = getDominancePairs(silhouetteNames)
    console.log("Dominance Pairs:", dominancePairs)
    const labels = [...new Set(dominancePairs.flat())]

    const { matrix, nodes } = po.domFromEdges(dominancePairs, "1", "0")
    console.log(matrix)
    console.log(nodes)
    const poset = po.createPoset(matrix, nodes)
    poset.setLayers()
    poset.setDepth()
    poset.color(1)
    poset
      .enrich()
      .feature("parents", (name) => poset.getCovered(name).map((parent) => poset.features[parent]))
      .feature("children", (name) => poset.getCovering(name).map((child) => poset.features[child]))
      .feature("i", (name) => poset.elements.indexOf(name))
      .feature("statesArray", (name) => name.split("-"))
      .feature("orderedName", (name) => {
        const states = name.split("-")
        // Ensure statesNamesLoaded is available before mapping
        if (statesNamesLoaded?.length > 0) {
          return states.map((s) => statesNamesLoaded.indexOf(s).toString()).join("-")
        }
        return name // Fallback
      })

    const leaves = poset.layers[poset.layers.length - 1] || []

    const orderedLeaves = [...leaves].sort((a, b) => {
      // Use the 'orderedName' feature for sorting
      return poset.features[a].orderedName.localeCompare(poset.features[b].orderedName, "en", {
        numeric: true,
      })
    })

    const covers = poset.getCoverRelations()
    return { poset, covers, leaves, orderedLeaves }
  }, [silhouettes, statesNamesLoaded])

  // Step 2: Memoize the layout calculations.
  // This re-runs if the base poset, dimensions, or hoveredNode change.
  return useMemo(() => {
    const { poset, covers, leaves, orderedLeaves } = basePosetData
    if (!poset) return { poset: null, covers: [] }

    // --- Scales ---
    const xPointScale = scalePoint(orderedLeaves, [padding, width - padding])
    const yScale = scaleLinear([1, statesNamesLoaded.length], [padding, height - padding])

    poset.feature("yPositionScaled", (_name, d) => yScale(d.statesArray.length))

    // --- Fisheye/Magnification Logic ---
    let siblingScale = null
    let leftScale = null
    let rightScale = null
    let focusX = null
    let siblingNames = []
    const segmentPadding = 20

    if (
      hoveredNode &&
      leaves.includes(hoveredNode.name) &&
      width / leaves.length < nodeRadius * 2
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

        const magnifiedGroupWidth = siblingNames.length * nodeRadius * 2
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

    // --- X-Position Function ---
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

    // --- Apply Positions ---
    poset.climber(function (layer, h) {
      layer.forEach((name) => {
        poset.features[name].xPosition =
          h === 0 ? setXPosition(name) : centerParentNodes(name, poset)
      })
    })

    return { poset, covers, yScale }
  }, [basePosetData, width, height, nodeRadius, padding, hoveredNode, statesNamesLoaded])
}

/**
 * Calculates node styles and labels based on the hovered node.
 * This is derived state, so useMemo is preferred over useEffect+useState.
 */
const useNodeStyling = (poset, hoveredNode) => {
  return useMemo(() => {
    const styles = {}
    const labels = {}
    if (!poset) return { styles, labels }

    if (hoveredNode) {
      // 1. Default dimmed state
      poset.elements.forEach((name) => {
        styles[name] = { opacity: 0.3, scale: 0.8 }
      })

      // 2. Recursive helper
      const styleRelatives = (node, relationship, level, visited) => {
        if (!node || visited.has(node.name)) return
        visited.add(node.name)

        styles[node.name] = {
          opacity: 1, // Keep relatives visible
          scale: Math.max(0.6, 1 - level * 0.1),
        }
        labels[node.name] = `${relationship} ${level}`

        const nextNodes = relationship === "Parent" ? node.parents : node.children
        nextNodes?.forEach((nextNode) => styleRelatives(nextNode, relationship, level + 1, visited))
      }

      // 3. Highlight hovered and relatives
      styles[hoveredNode.name] = { opacity: 1, scale: 1 }
      const visited = new Set([hoveredNode.name])
      hoveredNode.parents?.forEach((p) => styleRelatives(p, "Parent", 1, visited))
      hoveredNode.children?.forEach((c) => styleRelatives(c, "Child", 1, visited))

      // 4. Highlight siblings (from magnification logic)
      const parentName = poset.getCovered(hoveredNode.name)[0]
      const parent = poset.features[parentName]
      if (parent) {
        const siblings = parent.children
        const siblingNames = siblings.map((d) => d.name)
        siblingNames.forEach((name) => {
          // Only override if not the hovered node itself
          if (name !== hoveredNode.name) {
            styles[name] = { opacity: 1, scale: 1 }
          }
        })
      }
    } else {
      // 5. Reset all if no hover
      poset.elements.forEach((name) => {
        styles[name] = { opacity: 1, scale: 1 }
      })
    }

    return { styles, labels }
  }, [poset, hoveredNode])
}

export function SilhouettesHasse({
  silhouettes,
  selectedSilhouettes,
  toggleSilhouetteFilter,
  palette,
  x,
  y,
  statesNamesLoaded,
}) {
  const [hoveredNode, setHoveredNode] = useState(null)
  const hoverTimeoutRef = useRef(null) // Add this line

  const handleMouseEnter = (node) => {
    // Clear any existing timeout (if user moves fast between nodes)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Set a new timeout to trigger the hover state after 100ms
    hoverTimeoutRef.current = setTimeout(() => {
      if (hoveredNode === null) setHoveredNode(node)
      if (hoveredNode) {
        const parentName = poset.getCovered(hoveredNode.name)[0]
        const parent = poset.features[parentName]
        const siblings = parent.children
          .filter((child) => child.name !== hoveredNode.name)
          .map((d) => d.name)
        if (!siblings.includes(node.name)) setHoveredNode(node)
      }
    }, 500)
  }

  const handleMouseLeave = () => {
    // Clear the pending timeout when the mouse leaves
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Set the hover state to null immediately
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null)
    }, 500)
  }

  // const wiggle = (id) => {
  //   if (!hoveredNode) return {}
  // }

  const width = 1200
  const height = 500
  const padding = 50
  const nodeRadius = 18

  // console.log("State Names Loaded", statesNamesLoaded)
  // console.log("Test Value", test)

  const [scope] = useAnimate() // 'animate' function removed as it was unused

  const { covers, poset, yScale } = usePosetLayout(
    silhouettes,
    width,
    height,
    nodeRadius,
    padding,
    statesNamesLoaded,
    hoveredNode
    // hoverState // Unused
  )

  // Calculate styles and labels using the custom hook
  const { styles, labels: nodeLabels } = useNodeStyling(poset, hoveredNode)

  // Determine rendering order: hovered node last (to be on top)
  const nodesForRender = useMemo(() => {
    if (!poset?.elements) return []
    const elementNames = [...poset.elements]
    if (!hoveredNode) return elementNames

    const idx = elementNames.findIndex((name) => name === hoveredNode.name)
    if (idx > -1) {
      const [nodeName] = elementNames.splice(idx, 1)
      elementNames.push(nodeName) // Add to the end, so it renders last
    }
    return elementNames
  }, [poset, hoveredNode])

  // Don't render anything until the poset is calculated
  if (!poset?.elements.length) return null

  const chipVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0 },
  }

  console.log("Poset", poset)

  const layersByLength = Object.entries(
    groupBy(flattenDeep(poset.layers), (l) => l.split("-").length)
  )
  console.log("LBL", layersByLength)

  return (
    <svg width={width} height={height} ref={scope}>
      {/* GRID */}
      {layersByLength.map(([key, value], i) => {
        const statesNumber = key
        const silhouettePerLayer = value.length

        return (
          <motion.g
            key={`grid-line-${key}`}
            initial={{
              y: yScale(statesNumber),
            }}
          >
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{
                pathLength: 1,
                transition: { delay: 0.3 + 0.1 * i },
              }}
              x1={0}
              x2={width}
              strokeWidth={0.5}
              stroke={"#717171aa"}
            />
            <motion.text
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -6, transition: { delay: 0.3 + 0.1 * i } }}
              fontSize={12}
              fill="var(--text-light)"
            >
              L{statesNumber}
            </motion.text>
            <motion.text
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 15, transition: { delay: 0.3 + 0.1 * i } }}
              fontSize={12}
              fill="var(--text-light)"
            >
              {silhouettePerLayer} lines
            </motion.text>
          </motion.g>
        )
      })}

      {/* Draw cover relations */}
      {covers.map((cover) => {
        const src = poset.features[cover.source]
        const tgt = poset.features[cover.target]

        if (!src || !tgt) return null

        const isSelected =
          selectedSilhouettes.includes(cover.source) && selectedSilhouettes.includes(cover.target)

        return (
          <motion.path
            key={`cover-${cover.source}-${cover.target}`}
            id={`cover-${cover.source}-${cover.target}`}
            initial={false} // Prevent initial animation
            animate={{
              d: `M${src.xPosition},${src.yPositionScaled} L${tgt.xPosition},${tgt.yPositionScaled}`,
              stroke: isSelected ? "#ccc" : "#717171ff",
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            strokeWidth={2}
            whileHover={{ strokeWidth: 6, cursor: "pointer" }}
            onClick={() => toggleSilhouetteFilter([cover.source, cover.target])}
          />
        )
      })}

      <g className="nodes">
        {nodesForRender.map((name) => {
          const node = poset.features[name]
          if (!node) return null // Safety check
          const isSelected = selectedSilhouettes.includes(name)
          const size = 30
          const nodeStyle = styles[name] || { opacity: 1, scale: 1 }

          return (
            <motion.g
              key={name}
              id={`node-wrapper-${name}`}
              // Set initial state directly, no need for separate `initial` prop
              // as `animate` will be applied on first render.
              initial={false}
              animate={{
                x: node.xPosition,
                y: node.yPositionScaled,
                opacity: nodeStyle.opacity,
                scale: nodeStyle.scale,
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onMouseEnter={() => handleMouseEnter(node)}
              onMouseLeave={handleMouseLeave}
              onClick={() => toggleSilhouetteFilter(name)}
              style={{ cursor: "pointer", zIndex: name === hoveredNode?.name ? 10 : 1 }}
              whileHover={{ scale: 1.2, opacity: 1, transition: { duration: 0.5 } }}
            >
              <motion.rect
                x={-nodeRadius}
                y={-nodeRadius}
                width={nodeRadius * 2}
                height={nodeRadius * 2}
                fill={"var(--surface-secondary)"}
                stroke={isSelected ? "var(--surface-accent)" : node.fill || "#ccc"}
                strokeWidth={isSelected ? 2 : 0.5}
                rx={4}
                ry={4}
                whileTap={{ scale: 0.95 }}
                // whileHover={() => !hoveredNode && createWiggle(0.1, nodeRadius)}
              />
              <SilhouettePathSvg
                silhouetteName={name}
                palette={palette}
                xScale={x}
                yScale={y}
                posX={-size / 2}
                posY={-size / 2}
                animationDuration={0.2}
                viewBox={size}
                useAsSize={true}
                strokeWidth={9}
              />
              <motion.text
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                x={0}
                y={-nodeRadius - 5}
                textAnchor="middle"
                fill="var(--surface-accent)"
                fontSize={10}
                style={{ pointerEvents: "none" }}
              >
                {nodeLabels[name] || ""}
              </motion.text>
              <title>{name}</title>
            </motion.g>
          )
        })}
      </g>
    </svg>
  )
}

export function getDominancePairs(names) {
  const pairs = []
  for (let i = 0; i < names.length; i++) {
    for (let j = 0; j < names.length; j++) {
      if (i === j) continue

      // Helper function to correctly segment the names
      // An empty string "" should result in an empty array [] of segments
      const segment = (name) => (name === "" ? [] : name.split("-"))

      const a = segment(names[i])
      const b = segment(names[j])

      // a is dominated by b if b starts with a and b is longer
      if (b.length > a.length && a.every((val, idx) => b[idx] === val)) {
        pairs.push([names[i], names[j]])
      }
    }
  }
  return pairs
}

const createWiggle = (strength = 0.1, nodeRadius) => {
  const s = nodeRadius - strength

  return {
    x: [-nodeRadius, -s, s, -s, s, -nodeRadius],
    y: [-nodeRadius, s, -s, s, -s, -nodeRadius],

    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "loop",
      ease: "linear",
    },
  }
}
