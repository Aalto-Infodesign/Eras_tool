import { useMemo } from "react"
import { motion } from "motion/react"
import { includes, map } from "lodash"

import { useFilters } from "../../../../../contexts/FiltersContext"

export const LumpPolygon = ({
  data,
  timePlacement,
  selectedLumps,
  toggleSelectedLumps,
  hoveredLump,
  setHoveredLump,
  x,
  y,
  marginTop,
  lumpPadding,
  lumpOffsetX,
  palette,
  animationDuration,
  opacityScale,
}) => {
  const { isDragging } = useFilters()
  // --- Memoize polygon calculations ---
  const [polygonPoints, originPolygonPoints] = useMemo(() => {
    function createPolygonFromLump(data) {
      const sourceY = y(data.source.state) + marginTop
      const targetY = y(data.target.state) + marginTop
      const sourcePadding = targetY > sourceY ? lumpPadding : -lumpPadding
      const targetPadding = targetY > sourceY ? -lumpPadding : lumpPadding
      const offsetX = targetY > sourceY ? -lumpOffsetX : lumpOffsetX

      return `${x(data.source.xExtent[0]) - offsetX},${sourceY + sourcePadding} ${
        x(data.source.xExtent[1]) - offsetX
      },${sourceY + sourcePadding} ${x(data.target.xExtent[1]) + offsetX},${targetY + targetPadding} ${
        x(data.target.xExtent[0]) + offsetX
      },${targetY + targetPadding}`
    }

    function createOriginPolygonFromLump(data) {
      const sourceY = y(data.source.state) + marginTop
      const targetY = y(data.target.state) + marginTop
      const sourcePadding = targetY > sourceY ? lumpPadding : -lumpPadding
      const targetPadding = targetY > sourceY ? -lumpPadding : lumpPadding
      const offsetX = targetY > sourceY ? -lumpOffsetX : lumpOffsetX

      return `${x(data.source.xExtent[0]) - offsetX},${sourceY + sourcePadding} ${
        x(data.source.xExtent[0]) - offsetX
      },${sourceY + sourcePadding} ${x(data.target.xExtent[0]) + offsetX},${targetY + targetPadding} ${
        x(data.target.xExtent[0]) + offsetX
      },${targetY + targetPadding}`
    }

    return [createPolygonFromLump(data), createOriginPolygonFromLump(data)]
  }, [data, x, y, marginTop, lumpPadding, lumpOffsetX])

  // --- Calculate fill based on time placement ---
  const fill = useMemo(() => {
    if (timePlacement === "present") {
      if (data.source.state === data.target.state) {
        return palette[data.source.state]
      } else {
        return `url(#gradient-${data.source.state}-${data.target.state})`
      }
    } else if (timePlacement === "past") {
      return "url(#patternLines)"
    } else if (timePlacement === "remote") {
      return "url(#patternCircles)"
    }
    return ""
  }, [timePlacement, data.source.state, data.target.state, palette])

  // --- Calculate selection and hover states ---
  const isSelected = includes(map(selectedLumps, "type"), data.type)
  const isHovered = hoveredLump && hoveredLump.type === data.type

  // --- Calculate opacity based on hover and selection state ---
  const opacity = useMemo(() => {
    const baseOpacity = opacityScale(data.links.length)

    if (isSelected) {
      // This lump is selected but not hovered: use base opacity
      return 1
    }
    if (!hoveredLump) {
      // Nothing is hovered: use scale-based opacity
      return baseOpacity
    }

    if (isHovered) {
      // This lump is hovered: boost opacity further if selected
      return isSelected ? 1 : opacityScale(data.links.length)
    }

    // Something else is hovered: decrease opacity
    return 0.2
  }, [hoveredLump, isHovered, isSelected, opacityScale, data.links.length])

  const id = `lump-${timePlacement}-${data.type}`
  const className = `lump-${timePlacement}`

  return (
    <motion.polygon
      key={id}
      id={id}
      className={className}
      initial={{ opacity: 0.1, points: originPolygonPoints }}
      animate={{
        opacity: opacity,
        points: polygonPoints,
        scaleY: isDragging ? 0.9 : 1,
      }}
      exit={{ points: originPolygonPoints }}
      transition={{ duration: animationDuration }}
      fill={fill}
      strokeWidth={isSelected ? 0.5 : 0}
      stroke={"white"}
      style={{ cursor: "pointer" }}
      onClick={() => toggleSelectedLumps(data)}
      onMouseEnter={() => setHoveredLump(data)}
      onMouseLeave={() => setHoveredLump(null)}
    />
  )
}
