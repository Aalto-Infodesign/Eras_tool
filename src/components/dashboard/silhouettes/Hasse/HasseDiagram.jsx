import { useState, useMemo, useRef } from "react"
import { flatten } from "lodash"

import { AnimatePresence, motion } from "motion/react"

import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"

import { usePosetLayout } from "../hooks/usePosetLayout"
import { useNodeStyling } from "../hooks/useNodeStyling"

import { SilhouettePathSvg } from "../shared/SilhouettePathSvg"

export function HasseDiagram({
  isHasse,
  selectedSilhouettes,
  toggleSilhouetteFilter,
  x,
  y,
  statesNamesLoaded,
}) {
  const { silhouettes } = useData()
  const { palette } = useViz()
  console.time("Morph Hasse Render")
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
        // console.log("Parent Name:", parentName)
        if (parentName) {
          const parent = poset.features[parentName]
          const siblings = parent.children
            .filter((child) => child.name !== hoveredNode.name)
            .map((d) => d.name)
          if (!siblings.includes(node.name)) setHoveredNode(node)
        }
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

  const selectChildren = (nodeName) => {
    const children = poset.getCovering(nodeName)
    // console.log(children)
    toggleSilhouetteFilter(children)
  }

  const selectAllChildren = (nodeName) => {
    console.log("Select ALL children of", nodeName)
  }

  const rectWidth = isHasse ? 36 : 72
  const padding = isHasse ? 20 : 20
  const height = isHasse ? 500 : 100
  const width = isHasse
    ? Math.max(700, silhouettes.length * 10)
    : silhouettes.length * (rectWidth + 8) - 8

  const rectHeight = isHasse ? rectWidth : 91.5

  const { covers, poset, yScale, layersByLength } = usePosetLayout(
    silhouettes,
    width,
    height,
    rectWidth,
    rectHeight,
    padding,
    statesNamesLoaded,
    hoveredNode,
    isHasse,

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

  console.timeEnd("Morph Hasse Render")

  return (
    <motion.svg
      initial={{ height: height, width: width }}
      animate={{ height: height, width: width }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* GRID */}
      {layersByLength.map(([key, value], i) => {
        const statesNumber = Number(key)
        const silhouettePerLayer = value.length

        return (
          <motion.g
            key={`grid-line-${key}`}
            initial={{
              y: yScale(statesNumber),
            }}
            animate={{
              y: yScale(statesNumber),
            }}
            transition={{ duration: 0.5, delay: 0.3 + 0.1 * i, ease: "easeInOut" }}
          >
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{
                pathLength: 1,
                transition: { duration: 0.5, delay: 0.3 + 0.1 * i, ease: "easeInOut" },
              }}
              x1={0}
              x2={width}
              strokeWidth={0.5}
              stroke={"#717171aa"}
            />
            <motion.text
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: 1,
                y: -6,
                transition: { duration: 0.3, delay: 0.3 + 0.1 * i, ease: "easeInOut" },
              }}
              fontSize={12}
              fill="var(--text-light)"
            >
              L{statesNumber}
            </motion.text>
            <motion.text
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: 1,
                y: 15,
                transition: { duration: 0.3, delay: 0.3 + 0.1 * i, ease: "easeInOut" },
              }}
              fontSize={12}
              fill="var(--text-light)"
            >
              {silhouettePerLayer} lines
            </motion.text>
          </motion.g>
        )
      })}

      {/* Draw cover relations */}
      {covers.map((cover, i) => {
        const src = poset.features[cover.source]
        const tgt = poset.features[cover.target]

        if (!src || !tgt) return null

        const isSelected =
          selectedSilhouettes.includes(cover.source) && selectedSilhouettes.includes(cover.target)

        return (
          <motion.path
            key={`cover-${cover.source}-${cover.target}`}
            id={`cover-${cover.source}-${cover.target}`}
            initial={{
              pathLength: 0,
              d: `M${src.xPosition},${src.yPositionScaled} L${tgt.xPosition},${tgt.yPositionScaled}`,
            }} // Prevent initial animation
            animate={{
              pathLength: 1,
              d: `M${src.xPosition},${src.yPositionScaled} L${tgt.xPosition},${tgt.yPositionScaled}`,
              stroke: isSelected ? "#ccc" : palette[cover.source[cover.source.length - 1]],
              // stroke: isSelected ? "#ccc" : "#717171ff",
            }}
            exit={{ pathLength: 0 }}
            transition={{
              default: { duration: 0.2, ease: "easeInOut" },
              d: { duration: 0.8, ease: "easeInOut" },
              pathLength: { duration: isHasse ? 0.5 : 0, delay: 0.7 },
            }}
            strokeWidth={2}
            whileHover={{ strokeWidth: 6, cursor: "pointer" }}
            onClick={() => toggleSilhouetteFilter([cover.source, cover.target])}
          />
        )
      })}

      {
        <g className="nodes">
          {nodesForRender.map((name) => {
            const node = poset.features[name]

            if (!node) return null // Safety check
            const isSelected = selectedSilhouettes.includes(name)
            const nodeStyle = styles[name] || { opacity: 1, scale: 1 }

            const isInFirstLayers = flatten(
              poset.layers.filter((l, i) => i < poset.layers.length - 1),
            ).includes(name)

            return (
              <motion.g
                key={`node-wrapper-${name}`}
                id={`node-wrapper-${name}`}
                initial={false}
                animate={{
                  x: node.xPosition,
                  y: isHasse ? node.yPositionScaled : rectHeight / 2 - 10,
                  opacity: isHasse ? nodeStyle.opacity : 0,
                  scale: nodeStyle.scale,
                }}
                transition={{
                  default: { duration: 0.2, ease: "easeInOut" },
                  x: { duration: 0.8, ease: "easeInOut" },
                  y: { duration: 0.8, ease: "easeInOut" },
                  opacity: { delay: isHasse ? 0 : 1.5 },
                }}
              >
                <motion.g
                  onMouseEnter={() => handleMouseEnter(node)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => toggleSilhouetteFilter(name)}
                  style={{ cursor: "pointer", zIndex: name === hoveredNode?.name ? 10 : 2 }}
                  whileHover={{ scale: 1.1, opacity: 1 }}
                >
                  {!isInFirstLayers && (
                    <motion.circle
                      initial={{
                        r: 0,
                        height: 10,
                      }}
                      animate={{
                        r: 5,
                        height: 10,
                      }}
                      transition={{
                        default: { duration: 0.2, ease: "easeInOut" },
                        r: { duration: 1 },
                        height: { duration: 1 },
                      }}
                      fill={palette[name[name.length - 1]] || "var(--surface-contrast)"}
                      // fill={"var(--surface-contrast)"}
                      // stroke={isSelected ? "var(--surface-accent)" : palette[name[0]] || "#ccc"}
                      // stroke={isSelected ? "var(--surface-accent)" : node.fill || "#ccc"}
                      // strokeWidth={isHasse ? (isSelected ? 2 : 0.5) : 0}
                      whileTap={{ scale: 0.95 }}
                    />
                  )}
                  <AnimatePresence>
                    {(isInFirstLayers || isSelected) && (
                      <motion.g
                        initial={{
                          y: isHasse ? 0 : -10,
                          scale: 0,
                        }}
                        animate={{ y: isHasse ? 0 : -10, scale: 1 }}
                        exit={{
                          scale: 0,
                        }}
                      >
                        <motion.rect
                          initial={{
                            width: rectWidth,
                            height: rectHeight,
                          }}
                          animate={{
                            width: rectWidth,
                            height: rectHeight,
                          }}
                          transition={{
                            default: { duration: 0.2, ease: "easeInOut" },
                            width: { duration: 1 },
                            height: { duration: 1 },
                          }}
                          x={-rectWidth / 2}
                          y={-rectWidth / 2}
                          fill={"var(--surface-contrast)"}
                          stroke={isSelected ? "var(--surface-accent)" : palette[name[0]] || "#ccc"}
                          // stroke={isSelected ? "var(--surface-accent)" : node.fill || "#ccc"}
                          strokeWidth={isHasse ? (isSelected ? 2 : 0.5) : 0}
                          rx={4}
                          ry={4}
                          whileTap={{ scale: 0.95 }}
                        />
                        <SilhouettePathSvg
                          keyName="hasse"
                          silhouetteName={name}
                          palette={palette}
                          animationDuration={0.2}
                          xScale={x}
                          yScale={y}
                          useAsSize={true}
                          isHasse={isHasse}
                        />
                        {/* <text fill="white" dominant-baseline="middle" text-anchor="middle">
                    {name}
                  </text> */}
                      </motion.g>
                    )}
                  </AnimatePresence>
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    x={0}
                    y={-rectWidth / 2 - 5}
                    textAnchor="middle"
                    fill="var(--surface-accent)"
                    fontSize={10}
                    style={{ pointerEvents: "none" }}
                  >
                    {nodeLabels[name] || ""}
                  </motion.text>
                </motion.g>
                {isSelected && ( // TODO && has children
                  <motion.g
                    transform={`translate(${-rectWidth}, ${-5})`}
                    onDoubleClick={() => selectAllChildren(name)}
                    onClick={() => selectChildren(name)}
                  >
                    <rect width={10} height={10} rx={2} fill="white"></rect>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      x={5}
                      y={5}
                      fontSize={10}
                      fill="black"
                    >
                      v
                    </text>
                  </motion.g>
                )}
                <title>{name}</title>
              </motion.g>
            )
          })}
        </g>
      }
    </motion.svg>
  )
}
