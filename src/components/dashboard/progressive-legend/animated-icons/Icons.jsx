import { motion } from "motion/react"

export function TrajectoriesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
    >
      <g opacity="0.5">
        <line x1="15" y1="19.5" x2="85" y2="19.5" stroke="white" stroke-width="2" />
        <line x1="15" y1="34.5" x2="85" y2="34.5" stroke="white" stroke-width="2" />
        <line x1="15" y1="49.5" x2="85" y2="49.5" stroke="white" stroke-width="2" />
        <line x1="15" y1="64.5" x2="85" y2="64.5" stroke="white" stroke-width="2" />
        <line x1="15" y1="79.5" x2="85" y2="79.5" stroke="white" stroke-width="2" />
      </g>

      {/* <path
        d="M19.5 20L32 34.5L37 49.5L47.5 64.5L72.5 80"
        pathLength="1"
        stroke="#B794FF"
        stroke-width="2"
        stroke-dasharray="1 1"
      /> */}
      <motion.path
        d="M19.5 20L32 34.5L37 49.5L47.5 64.5L72.5 80"
        stroke="#B794FF"
        stroke-width="2"
        stroke-dasharray="1 1"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: [[0.5, 0, 0.5, 1], "linear"], times: [0, 0.329, 1] }}
      />
    </svg>
  )
}
