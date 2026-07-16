import { scaleLinear, scaleBand, max } from "d3"
import { motion } from "framer-motion"
import { useViz } from "../../../../contexts/VizContext"
import { useData } from "../../../../contexts/ProcessedDataContext"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"

export function SilhouettePathSvg({
  keyName = "",
  silhouetteName,
  animationDuration = 0.2,
  strokeWidth = 5,
  radius = 5,
  size = 64,
  isHasse = false,
}) {
  const { statesOrder } = useData()
  const { completeSilhouettes } = useDerivedData()
  const { palette } = useViz()

  // Drawing coordinates live in viewBox units, not on-screen pixels: the
  // browser scales the viewBox to whatever `size` the caller asks for.
  const viewBoxSize = 100
  const svgPadding = 12
  const yScale = scaleBand(statesOrder, [0, viewBoxSize]).padding(1)
  const xScale = scaleLinear(
    [0, max(completeSilhouettes.map((d) => d.states.length - 1))],
    [svgPadding, viewBoxSize - svgPadding], // Map from the left side of the world to the right side
  )

  const sizeProps = { width: size, height: size }

  const svgVariants = {
    default: { y: 0, ...sizeProps },
    hasse: { y: -size / 2, ...sizeProps },
  }

  return (
    <motion.svg
      key={`${keyName}-${silhouetteName}`}
      className="silhouetteCanvas"
      variants={svgVariants}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      x={-size / 2}
      initial={isHasse ? "hasse" : "default"}
      animate={isHasse ? "hasse" : "default"}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <g className="silhouetteGroup">
        {silhouetteName.split("-").map((char, i, arr) => {
          // Kept in animate (not plain attributes) so position/fill changes glide
          // like the paths' `d` instead of snapping.
          const circle = { r: radius, cx: xScale(i), cy: yScale(char), fill: palette[char] }
          return (
            <g key={`${keyName}-${silhouetteName}-${i}`}>
              <motion.circle
                initial={{ opacity: 0, ...circle }}
                animate={{ opacity: 1, ...circle }}
                transition={{
                  duration: animationDuration,
                  ease: "easeInOut",
                }}
                key={`circle-start-i${i}`}
                id={`circle-start-i${i}`}
                strokeWidth="1"
              />
              <motion.path
                initial={{
                  d: `M ${xScale(i)} ${yScale(char)} L ${xScale(i + 1)} ${yScale(arr[i + 1])}`,
                  pathLength: 0,
                  strokeWidth: 0,
                  opacity: 0,
                }}
                animate={{
                  d: `M ${xScale(i)} ${yScale(char)} L ${xScale(i + 1)} ${yScale(arr[i + 1])}`,
                  pathLength: 1,
                  strokeWidth: strokeWidth,
                  opacity: 0.5,
                }}
                transition={{
                  duration: animationDuration,
                  ease: "easeInOut",
                }}
                className="flow"
                stroke={palette[char]}
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )
        })}
        {/* 
        {silhouetteName.length === 1 && (
          <text x={35} y={65} fill="white" fontSize={50} fontWeight="bold">
            {silhouetteName}
          </text>
        )} */}
      </g>
      <title>{silhouetteName}</title>
    </motion.svg>
  )
}
