import { motion, AnimatePresence, useMotionValue, animate, useTransform } from "framer-motion"

import { useEffect } from "react"
import "./Pie.css"

export function SilhouettesPie(props) {
  const { selectedSilhouettesData } = props

  const selectedPercentages = selectedSilhouettesData.map((s) => s.percentage)
  const summedPercentages = selectedPercentages.reduce((a, s) => a + s, 0)

  const selectedSizes = selectedSilhouettesData.map((s) => s.size)
  const summedSizes = selectedSizes.reduce((a, s) => a + s, 0)

  // Chart dimensions
  const size = 100
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Calculate the path length for the filled portion
  const filledPathLength = summedPercentages / 100

  const percentage = useMotionValue(0)
  const summedSizesMotion = useMotionValue(0)

  const displayPercentage = useTransform(percentage, (latest) => {
    const decimalPlaces = latest > 1 || latest === 0 ? 1 : 3
    return `${latest.toFixed(decimalPlaces)}%`
  })
  const displaySizes = useTransform(summedSizesMotion, (latest) => {
    return `${Math.round(latest)}`
  })

  useEffect(() => {
    const controls = animate(percentage, summedPercentages, { duration: 0.2 })
    return () => controls.stop()
  }, [summedPercentages])

  useEffect(() => {
    const controls = animate(summedSizesMotion, summedSizes, { duration: 0.2 })
    return () => controls.stop()
  }, [summedSizes])

  return (
    <div className="pie-container">
      <div className="pie-chart-wrapper">
        <svg viewBox="0 0 100 100">
          {/* Background circle */}
          <motion.g
            id="pie"
            // initial={{ x: size / 2, y: size / 2 }}
            transform={`translate(${size / 2}, ${size / 2})`}
          >
            <g id="text">
              <motion.text
                className="pie-text"
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {displayPercentage}
              </motion.text>
            </g>
            <g
              id="circle"
              rotate={"-90deg"}
              //  transform={`rotate(-90deg)`}
            >
              <motion.circle
                className={"pie-background"}
                initial={{ strokeWidth: 0 }}
                animate={{
                  strokeWidth: strokeWidth,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.2,
                  ease: "easeOut",
                }}
                cx={0}
                cy={0}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
              />

              <AnimatePresence>
                {filledPathLength !== 0 && (
                  <motion.circle
                    cx={0}
                    cy={0}
                    r={radius}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference}
                    initial={{ pathLength: 0, strokeWidth: strokeWidth, opacity: 0 }}
                    animate={{
                      pathLength: filledPathLength,
                      opacity: 1,
                    }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{
                      duration: 0.3,
                      ease: ["easeOut"],
                    }}
                    style={{
                      percentage,
                      pathLength: filledPathLength,
                    }}
                  />
                )}
              </AnimatePresence>
            </g>
          </motion.g>
        </svg>
      </div>
      <motion.p key={"size-text"}>{displaySizes}</motion.p>
    </div>
  )
}
