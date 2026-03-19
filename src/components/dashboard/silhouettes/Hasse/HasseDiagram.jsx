import { useState, useMemo, useRef, useCallback, memo } from "react"
import { AnimatePresence, motion } from "motion/react"

import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"

import { usePosetLayout, useSilhouettesPoset } from "../hooks/usePosetLayout"
import { useNodeStyling } from "../hooks/useNodeStyling"

import { SilhouettePathSvg } from "../shared/SilhouettePathSvg"
import { useFilters } from "../../../../contexts/FiltersContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSITION_DEFAULT = { duration: 0.2, ease: "easeInOut" }
const TRANSITION_MORPH = { duration: 0.3, ease: "easeInOut" }

// ─── HasseDiagram ─────────────────────────────────────────────────────────────

export function HasseDiagram({
  posetData,
  statesNamesLoaded,
  selectedSilhouettes,
  toggleSilhouetteFilter,
  x,
  y,
}) {
  // const { silhouettes } = useData()
  const { isHasse } = useViz()
  const { silhouettes } = useDerivedData()
  const [hoveredNode, setHoveredNode] = useState(null)
  const hoverTimeoutRef = useRef(null)

  // ── Hover handlers (stable references) ──────────────────────────────────────

  const handleMouseEnter = useCallback((node) => {
    clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode((prev) => {
        if (prev === null) return node
        const parentName = poset.getCovered(prev.name)[0]
        if (parentName) {
          const siblings = poset.features[parentName].children
            .filter((child) => child.name !== prev.name)
            .map((d) => d.name)
          if (!siblings.includes(node.name)) return node
        }
        return prev
      })
    }, 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // poset is stable within a render cycle; deps intentionally omitted

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => setHoveredNode(null), 500)
  }, [])

  const selectChildren = useCallback(
    (nodeName) => {
      toggleSilhouetteFilter(poset.getCovering(nodeName))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [toggleSilhouetteFilter],
  )

  const selectAllChildren = useCallback((nodeName) => {
    console.log("Select ALL children of", nodeName)
  }, [])

  // ── Layout dimensions ────────────────────────────────────────────────────────

  const rectWidth = isHasse ? 36 : 72
  const padding = 20
  const height = isHasse ? 500 : 100
  const width = isHasse
    ? Math.max(700, silhouettes.length * 10)
    : silhouettes.length * (rectWidth + 8) - 8
  const rectHeight = isHasse ? rectWidth : 91.5

  // ── Poset layout & styles ────────────────────────────────────────────────────

  const orderedPosetData = useSilhouettesPoset(posetData, statesNamesLoaded)

  console.log("OP", orderedPosetData)

  const { covers, poset, yScale, layersByLength } = usePosetLayout(
    orderedPosetData,
    width,
    height,
    rectWidth,
    rectHeight,
    padding,
    hoveredNode,
    isHasse,
  )

  const { styles, labels: nodeLabels } = useNodeStyling(poset, hoveredNode)

  // ── Render order: hovered node paints last (on top) ─────────────────────────

  const nodesForRender = useMemo(() => {
    if (!poset?.elements) return []
    const names = [...poset.elements] // clean copy — no mutation
    if (!hoveredNode) return names
    const idx = names.findIndex((n) => n === hoveredNode.name)
    if (idx > -1) names.push(names.splice(idx, 1)[0])
    return names
  }, [poset, hoveredNode])

  // ── Last-layer set (for node type decision) ──────────────────────────────────

  const lastLayerSet = useMemo(() => {
    if (!poset?.layers?.length) return new Set()
    return new Set(poset.layers[poset.layers.length - 1])
  }, [poset])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <motion.svg animate={{ height, width }} transition={{ duration: 0.5, ease: "easeInOut" }}>
      {/* Grid lines */}
      {layersByLength.map(([key, value], i) => {
        const statesNumber = Number(key)
        const delay = 0.3 + 0.1 * i

        const included = value.map((s) => poset.features[s].included).filter((inc) => inc === true)

        return (
          <motion.g
            key={`grid-line-${key}`}
            initial={{ y: yScale(statesNumber) }}
            animate={{ y: yScale(statesNumber) }}
            transition={{ duration: 0.5, delay, ease: "easeInOut" }}
          >
            <motion.line
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay, ease: "easeInOut" }}
              x1={0}
              x2={width}
              strokeWidth={0.5}
              stroke="#717171aa"
            />
            <motion.text
              animate={{ opacity: 1, y: -6 }}
              transition={{ duration: 0.3, delay, ease: "easeInOut" }}
              fontSize={12}
              fill="var(--text-primary)"
            >
              L{statesNumber}
            </motion.text>
            <motion.text
              animate={{ opacity: 1, y: 15 }}
              transition={{ duration: 0.3, delay, ease: "easeInOut" }}
              fontSize={12}
              fill="var(--text-primary)"
            >
              {value.length !== included.length
                ? `${included.length}/${value.length} lines`
                : `${value.length} lines`}
            </motion.text>
          </motion.g>
        )
      })}

      {/* Cover relations */}
      {covers.map((cover) => {
        const src = poset.features[cover.source]
        const tgt = poset.features[cover.target]
        if (!src || !tgt) return null

        const isSelected =
          selectedSilhouettes.includes(cover.source) && selectedSilhouettes.includes(cover.target)

        return (
          <HasseLink
            key={`cover-${cover.source}-${cover.target}`}
            cover={cover}
            src={src}
            tgt={tgt}
            isHasse={isHasse}
            isSelected={isSelected}
            toggleSilhouetteFilter={toggleSilhouetteFilter}
          />
        )
      })}

      {/* Nodes */}
      <g className="nodes">
        {nodesForRender.map((name) => {
          const node = poset.features[name]
          if (!node) return null

          return (
            <HasseNode
              key={`node-${name}`}
              name={name}
              node={node}
              isSelected={selectedSilhouettes.includes(name)}
              nodeStyle={styles[name] ?? { opacity: 1, scale: 1 }}
              isInFirstLayers={!lastLayerSet.has(name)}
              isHasse={isHasse}
              rectHeight={rectHeight}
              rectWidth={rectWidth}
              isHovered={hoveredNode?.name === name}
              nodeLabel={nodeLabels[name] ?? ""}
              toggleSilhouetteFilter={toggleSilhouetteFilter}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              selectChildren={selectChildren}
              selectAllChildren={selectAllChildren}
              x={x}
              y={y}
            />
          )
        })}
      </g>
    </motion.svg>
  )
}

// ─── HasseLink ────────────────────────────────────────────────────────────────
// Memoized: only re-renders when its own props change.

const HasseLink = ({ cover, src, tgt, isHasse, isSelected, toggleSilhouetteFilter }) => {
  const { palette } = useViz()
  const d = `M${src.xPosition},${src.yPositionScaled} L${tgt.xPosition},${tgt.yPositionScaled}`
  const targetName = cover.target.split("-").at(-1)

  const opacity = src.included && tgt.included ? 1 : 0.2
  const strokeColor = isSelected ? "#ccc" : palette[targetName]

  return (
    <motion.path
      id={`cover-${cover.source}-${cover.target}`}
      initial={{
        pathLength: 0,
        d,
        stroke: strokeColor,
        opacity: opacity,
      }}
      animate={{
        pathLength: 1,
        d,
        stroke: strokeColor,
        opacity: opacity,
      }}
      exit={{ pathLength: 0 }}
      transition={{
        ...TRANSITION_DEFAULT,
        d: TRANSITION_MORPH,
        pathLength: { duration: isHasse ? 0.5 : 0, delay: 0.7 },
      }}
      strokeWidth={2}
      whileHover={{ strokeWidth: 6, cursor: "pointer" }}
      onClick={() => toggleSilhouetteFilter([cover.source, cover.target])}
    />
  )
}

// ─── HasseNode ────────────────────────────────────────────────────────────────
// Memoized: re-renders only when its own slice of state changes.
// Note: `hoveredNode` was replaced with the derived boolean `isHovered`
// so this component doesn't re-render for every hover change on sibling nodes.

const HasseNode = memo(function HasseNode({
  name,
  node,
  isSelected,
  nodeStyle,
  isInFirstLayers,
  isHasse,
  rectHeight,
  rectWidth,
  isHovered,
  nodeLabel,
  toggleSilhouetteFilter,
  handleMouseEnter,
  handleMouseLeave,
  selectChildren,
  selectAllChildren,
  x,
  y,
}) {
  const { palette } = useViz()

  const silhouetteNames = name.split("-")

  return (
    <motion.g
      id={`node-wrapper-${name}`}
      initial={false}
      animate={{
        x: node.xPosition,
        y: node.yPositionScaled,
        opacity: node.included ? nodeStyle.opacity : 0.2,
        scale: nodeStyle.scale,
      }}
      transition={{
        ...TRANSITION_DEFAULT,
        x: TRANSITION_MORPH,
        y: TRANSITION_MORPH,
        opacity: { delay: 0 },
      }}
    >
      <motion.g
        onMouseEnter={() => handleMouseEnter(node)}
        onMouseLeave={handleMouseLeave}
        onClick={() => toggleSilhouetteFilter(name)}
        style={{ cursor: "pointer", zIndex: isHovered ? 10 : 2 }}
        whileHover={{ scale: 1.1, opacity: 1 }}
      >
        {!isInFirstLayers && (
          <motion.circle
            animate={{ r: 5 }}
            transition={{ duration: 1 }}
            fill={palette[silhouetteNames.at(-1)] ?? "var(--surface-contrast)"}
            whileTap={{ scale: 0.95 }}
          />
        )}

        <AnimatePresence>
          {(isInFirstLayers || isSelected) && (
            <motion.g
              initial={{ y: isHasse ? 0 : -10, scale: 0 }}
              animate={{ y: isHasse ? 0 : -10, scale: 1 }}
              exit={{ scale: 0 }}
            >
              <motion.rect
                animate={{ width: rectWidth, height: rectHeight }}
                transition={{ duration: 1 }}
                x={-rectWidth / 2}
                y={-rectWidth / 2}
                fill="var(--surface-contrast)"
                stroke={
                  isSelected ? "var(--surface-accent)" : (palette[silhouetteNames[0]] ?? "#ccc")
                }
                strokeWidth={isHasse ? (isSelected ? 2 : 0.5) : 0}
                rx={4}
                ry={4}
                whileTap={{ scale: 0.95 }}
              />
              <SilhouettePathSvg
                keyName="hasse"
                silhouetteName={name}
                animationDuration={0.2}
                xScale={x}
                yScale={y}
                useAsSize={true}
                isHasse={isHasse}
              />
            </motion.g>
          )}
        </AnimatePresence>

        <motion.text
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          x={0}
          y={-rectWidth / 2 - 5}
          textAnchor="middle"
          fill="var(--surface-accent)"
          fontSize={10}
          style={{ pointerEvents: "none" }}
        >
          {nodeLabel}
        </motion.text>
      </motion.g>

      {isSelected && (
        <motion.g
          transform={`translate(${-rectWidth}, ${-5})`}
          onDoubleClick={() => selectAllChildren(name)}
          onClick={() => selectChildren(name)}
        >
          <rect width={10} height={10} rx={2} fill="white" />
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
})
