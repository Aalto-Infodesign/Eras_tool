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
  isChip = false,
  w = 100,
  h = 100,
}) {
  const { statesOrder } = useData()
  const { completeSilhouettes } = useDerivedData()
  const { palette, isHasse } = useViz()

  const svgPadding = 12
  const yScale = scaleBand(statesOrder, [0, h]).padding(0.8)
  const xScale = scaleLinear(
    [0, max(completeSilhouettes.map((d) => d.states.length - 1))],
    [svgPadding, w - svgPadding], // Map from the left side of the world to the right side
  )

  const size = isChip ? 32 : isHasse ? 30 : 64

  const svgVariants = {
    chip: { y: 0, width: size, height: size },
    hasse: { y: -size / 2, width: size, height: size },
    trajectory: { y: 0, width: size, height: size },
  }

  return (
    <motion.svg
      key={`${keyName}-${silhouetteName}`}
      className="silhouetteCanvas"
      variants={svgVariants}
      viewBox={"0 0 100 100"}
      width={size}
      height={size}
      x={-size / 2}
      initial={isChip ? "chip" : isHasse ? "hasse" : "trajectory"}
      animate={isChip ? "chip" : isHasse ? "hasse" : "trajectory"}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <g
        className="silhouetteGroup
    "
      >
        {silhouetteName.split("-").map((char, i, arr) => {
          const circleVariants = {
            hidden: { opacity: 0, r: 5, cx: xScale(i), cy: yScale(char), fill: palette[char] },
            trajectory: { opacity: 1, r: 5, cx: xScale(i), cy: yScale(char), fill: palette[char] },
            hasse: { opacity: 1, r: 9, cx: xScale(i), cy: yScale(char), fill: palette[char] },
          }
          return (
            <g key={`${keyName}-${silhouetteName}-${i}`}>
              <motion.circle
                variants={circleVariants}
                initial={"hidden"}
                animate={isHasse ? "hasse" : "trajectory"}
                transition={{
                  duration: animationDuration,
                  ease: "easeInOut",
                }}
                key={`circle-start-i${i}`}
                id={`circle-start-i${i}`}
                strokeWidth="1"
              />
              <motion.path
                initial={{ pathLength: 0, strokeWidth: 0, opacity: 0 }}
                animate={{ pathLength: 1, strokeWidth: strokeWidth, opacity: 0.5 }}
                transition={{
                  duration: animationDuration,
                  ease: "easeInOut",
                }}
                className="flow animated"
                d={`M ${xScale(i)} ${yScale(char)} L ${xScale(i + 1)} ${yScale(arr[i + 1])}`}
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
