import { useMemo, useState } from "react"
import { bin, scaleLinear, max, line, curveCatmullRom, curveLinear, area } from "d3"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip } from "../../../common/Tooltip/Tooltip"

/**
 * DurationDistributionChart — declarative + Framer Motion
 *
 * is used purely as a math library (scales, bin, line/area generators).
 * React renders all SVG elements declaratively — no imperative DOM mutations.
 * Framer Motion animates the path, dots, and axes on mount and data change.
 *
 * Props:
 *   data    {number[]}  Array of duration values
 *   label   {string}    X-axis label
 *   bins    {number}    Approximate number of histogram bins
 *   width   {number}    SVG width in px (defaults to 620)
 *   height  {number}    SVG height in px (defaults to 280)
 */
export default function DurationDistributionChart({
  data,
  label = "Duration (years)",
  bins = 15,
  width = 1000,
  height = 250,
}) {
  const [tooltip, setTooltip] = useState(null)

  const margin = { top: 20, right: 24, bottom: 48, left: 52 }
  const W = width - margin.left - margin.right
  const H = height - margin.top - margin.bottom

  const { binnedData, xScale, yScale, linePath, areaPath, midpoints, ticks } = useMemo(() => {
    if (!data?.length)
      return {
        binnedData: [],
        xScale: null,
        yScale: null,
        linePath: "",
        areaPath: "",
        midpoints: [],
        ticks: { x: [], y: [] },
      }

    const binnedData = bin().thresholds(bins)(data)

    const xScale = scaleLinear()
      .domain([binnedData[0].x0, binnedData[binnedData.length - 1].x1])
      .range([0, W])

    const yScale = scaleLinear()
      .domain([0, max(binnedData, (d) => d.length) * 1.1])
      .range([H, 0])

    // Each midpoint is the center x of a bin paired with its count
    const midpoints = binnedData.map((b) => [(b.x0 + b.x1) / 2, b.length])

    // line/area return path "d" strings — we just pass them to <path d={...}>
    const lineGen = line()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(curveCatmullRom.alpha(0.5))

    const areaGen = area()
      .x((d) => xScale(d[0]))
      .y0(H)
      .y1((d) => yScale(d[1]))
      .curve(curveCatmullRom.alpha(0.5))

    // Pre-compute axis tick values so we can render them as JSX
    const xTicks = xScale.ticks(6).map((v) => ({
      value: v,
      x: xScale(v),
    }))

    const yTicks = yScale.ticks(5).map((v) => ({
      value: v,
      y: yScale(v),
    }))

    return {
      binnedData,
      xScale,
      yScale,
      linePath: lineGen(midpoints) ?? "",
      areaPath: areaGen(midpoints) ?? "",
      midpoints,
      ticks: { x: xTicks, y: yTicks },
    }
  }, [data, bins, W, H])

  // if (!data?.length) return null

  return (
    <div style={{ position: "relative" }}>
      <svg
        id="distribution-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Duration distribution line chart"
        role="img"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* --- Grid lines (y) ------------------------------------------ */}
          {ticks.y.map(({ value, y }) => (
            <motion.line
              key={`grid-${value}`}
              x1={0}
              x2={W}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.07}
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
          ))}

          {/* --- Area fill ----------------------------------------------- */}
          <motion.path
            d={areaPath}
            fill="var(--surface-accent)"
            fillOpacity={0.1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          {/* --- Line ---------------------------------------------------- */}
          {/*
           * Animating SVG path length:
           * pathLength={1} tells Framer Motion to treat the path as unit-length.
           * strokeDasharray={1} + strokeDashoffset animates from fully hidden (1)
           * to fully visible (0) — the classic "draw-on" line effect.
           */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="var(--surface-accent)"
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={1}
            initial={{ strokeDashoffset: 1 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />

          {/* --- Dots ---------------------------------------------------- */}
          {midpoints.map(([mx, my], i) => (
            <motion.circle
              key={`dot-${i}`}
              cx={xScale(mx)}
              cy={yScale(my)}
              r={tooltip?.index === i ? 6 : 4}
              fill="var(--surface-accent)"
              stroke="white"
              strokeWidth={1}
              style={{ cursor: "pointer" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.2 + i * 0.03, // staggered reveal after line draws
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              onHoverStart={() =>
                setTooltip({
                  index: i,
                  x: xScale(mx) + margin.left,
                  y: yScale(my) + margin.top,
                  range: `${Math.round(binnedData[i].x0)}–${Math.round(binnedData[i].x1)}`,
                  count: binnedData[i].length,
                })
              }
              onHoverEnd={() => setTooltip(null)}
            />
          ))}

          {/* --- X axis -------------------------------------------------- */}
          <g transform={`translate(0,${H})`}>
            <line x1={0} x2={W} stroke="currentColor" strokeOpacity={0.1} />
            {ticks.x.map(({ value, x }) => (
              <motion.g
                key={`x-tick-${value}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <line x1={x} x2={x} y1={0} y2={4} stroke="currentColor" strokeOpacity={0.3} />
                <text
                  x={x}
                  y={18}
                  textAnchor="middle"
                  fontSize={12}
                  fill="currentColor"
                  opacity={0.5}
                >
                  {value}
                </text>
              </motion.g>
            ))}
            <text
              x={W / 2}
              y={40}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
              opacity={0.5}
            >
              {label}
            </text>
          </g>

          {/* --- Y axis -------------------------------------------------- */}
          <g>
            <line x1={0} x2={0} y1={0} y2={H} stroke="currentColor" strokeOpacity={0.1} />
            {ticks.y.map(({ value, y }) => (
              <motion.g
                key={`y-tick-${value}`}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <line x1={0} x2={-4} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.3} />
                <text
                  x={-10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="currentColor"
                  opacity={0.5}
                >
                  {value}
                </text>
              </motion.g>
            ))}
            <text
              transform={`rotate(-90) translate(${-H / 2}, ${-38})`}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
              opacity={0.5}
            >
              Count
            </text>
          </g>
        </g>
      </svg>

      {/* --- Tooltip (outside SVG so it can overflow freely) -------------- */}
      {tooltip && (
        <Tooltip isVisible={tooltip}>
          <div style={{ fontWeight: 600 }}>{tooltip.range}</div>
          <div style={{ opacity: 0.6 }}>{tooltip.count} values</div>
        </Tooltip>
      )}
    </div>
  )
}
