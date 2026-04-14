import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"
import { extent, range, scaleBand, scaleLinear, scaleQuantile, ticks } from "d3"
import { map, countBy, uniq, flatten, values, sum, max, min } from "lodash"
import { useViz } from "../../../contexts/VizContext"
import { useData } from "../../../contexts/ProcessedDataContext"

import { Tooltip } from "../../common/Tooltip/Tooltip"

import { curveStep, line } from "d3"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { ZoomIn, ZoomOut } from "lucide-react"
import Button from "../../common/Button/Button"

const PADDING = 0
const ZOOM_STEPS = 5

export function StatesMatrix({ width, height, lineChartMode }) {
  const { statesOrder } = useData()
  const { lumps } = useDerivedData()
  const { palette } = useViz()
  const { selectedLumps, toggleSelectedLumps } = useFilters()

  // const [selectedCell, setSelectedCell] = useState(null)
  const [hoveredQuantile, setHoveredQuantile] = useState(null)

  // THESE ARE LUMPS -> useLumps(links)
  const matrixCouples = useMemo(
    () =>
      lumps.map((l) => {
        const durations = map(l.links, (l) => l.target.date - l.source.date)
        const sourceDates = map(l.links, (l) => l.source.date)
        const targetDates = map(l.links, (l) => l.source.date)
        const sourceAges = map(l.links, (l) => l.source.age)
        const targetAges = map(l.links, (l) => l.target.age)
        return {
          ...l,
          duration: durations,
          countedDurations: map(countBy(durations, Math.floor), (v, k) => ({
            x: Number(k),
            y: v,
          })),
          sourceD: sourceDates,
          countedSourceDates: map(countBy(sourceDates, Math.floor), (v, k) => ({
            x: Number(k),
            y: v,
          })),
          targetD: targetDates,
          countedTargetDates: map(countBy(targetDates, Math.floor), (v, k) => ({
            x: Number(k),
            y: v,
          })),
          sourceAge: sourceAges,
          countedSourceAges: map(countBy(sourceAges, Math.floor), (v, k) => ({
            x: Number(k),
            y: v,
          })),
          targetAge: targetAges,
          countedTargetAges: map(countBy(targetAges, Math.floor), (v, k) => ({
            x: Number(k),
            y: v,
          })),
        }
      }),
    [lumps],
  )

  const buckets = ["short", "medium", "long", "longest"]

  const uniqueData = useMemo(() => {
    return uniq(flatten(matrixCouples.map((m) => m[lineChartMode]))).sort((a, b) => a - b)
  }, [matrixCouples, lineChartMode])

  const quantileScale = scaleQuantile(uniqueData, buckets)

  const valuesExtent = extent(matrixCouples.map((c) => c.count))
  const opacityScale = scaleLinear([0, valuesExtent[1]], [0, 1])

  const xScale = useMemo(
    () =>
      scaleBand()
        .domain(statesOrder)
        .range([PADDING, width - PADDING])
        .padding(0.15),
    [statesOrder],
  )

  const yScale = useMemo(
    () =>
      scaleBand()
        .domain(statesOrder)
        .range([PADDING, height - PADDING])
        .padding(0.15),
    [statesOrder],
  )
  console.log("matrixCouples", matrixCouples)

  const countExtent = extent(matrixCouples.map((c) => c.count))
  const zoomLevels = ticks(countExtent[0], countExtent[1] + 1, ZOOM_STEPS)

  console.log(zoomLevels)

  const [zoomStep, setZoomStep] = useState(zoomLevels.length - 1) // start at max

  const cellWidth = useMemo(
    () => scaleLinear([0, zoomLevels[zoomStep]], [0, xScale.bandwidth()]),
    [countExtent, xScale],
  )

  const handleZoomIn = () => {
    // cycle: max → mean → min → max
    setZoomStep((prev) => (prev === 0 ? zoomLevels.length - 1 : prev - 1))
  }

  const handleZoomOut = () => {
    // cycle: min → mean → max → min
    setZoomStep((prev) => (prev === zoomLevels.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="svg-container" id="matrix-chart">
      {/* <h4>StatesMatrix</h4> */}

      <svg preserveAspectRatio="xMidYMid meet" viewBox={`0 0 140 ${height}`}>
        <defs>
          <mask id="cell-mask">
            <rect width={xScale.bandwidth()} height={yScale.bandwidth()} fill="white" />
          </mask>
        </defs>
        {/* <g id="grid">
          {statesOrder.map((s) => {
            return (
              <g key={s}>
                <text x={xScale(s) + xScale.bandwidth() / 2} y={PADDING} fill={palette[s]}>
                  {s}
                </text>
                <text
                  x={PADDING / 2}
                  y={yScale(s) + yScale.bandwidth() / 2}
                  fill={palette[s]}
                  dominantBaseline={"middle"}
                >
                  {s}
                </text>
              </g>
            )
          })}
        </g> */}
        <motion.g id="header" animate={{ y: 0 }}>
          {statesOrder.map((s) => (
            <motion.text
              initial={{ y: -5, x: xScale(s) + xScale.bandwidth() / 2, rotate: "-35deg" }}
              animate={{ y: -5, x: xScale(s) + xScale.bandwidth() / 2 }}
              key={s}
              fill={palette[s]}
              fontSize={3}
              textAnchor="middle"
              dominantBaseline={"middle"}
            >
              {s.length > 15 ? `${s.substring(0, 8)}` + "…" : `${s}`}
            </motion.text>
          ))}
        </motion.g>
        <g id="cells">
          <AnimatePresence>
            {matrixCouples.map((s, i) => {
              const dataMap = {
                duration: s.countedDurations,
                sourceD: s.countedSourceDates,
                targetD: s.countedTargetDates,
                sourceAge: s.countedSourceAges,
                targetAge: s.countedTargetAges,
              }

              const activePoints = dataMap[lineChartMode]

              const isSelected = selectedLumps.map((l) => l.type).includes(s.type)
              return (
                <motion.g
                  key={s.type}
                  initial={{
                    x: xScale(s.target),
                    y: yScale(s.source),
                    scale: 1,
                    opacity: 0,
                  }}
                  animate={{
                    x: xScale(s.target),
                    y: yScale(s.source),
                    opacity: 1,
                    // scale: isSelected ? 1.1 : 1,
                  }}
                  exit={{ opacity: 0 }}
                  onClick={() => toggleSelectedLumps(s)}
                  mask={`url(#cell-mask)`}
                >
                  <motion.rect
                    width={xScale.bandwidth()}
                    height={yScale.bandwidth()}
                    fill="white"
                    animate={{ fillOpacity: opacityScale(s.count) }}
                    stroke="white"
                    strokeWidth={isSelected ? 1 : 0}
                  />
                  <Quantiles
                    width={cellWidth(s.count)}
                    //width={xScale.bandwidth()}
                    height={yScale.bandwidth()}
                    points={s[lineChartMode]}
                    buckets={buckets}
                    quantileScale={quantileScale}
                    setHoveredQuantile={setHoveredQuantile}
                  />
                  {/* <LineChart
                  width={xScale.bandwidth()}
                  height={yScale.bandwidth()}
                  points={activePoints}
                /> */}
                  <line x1={0} x2={0} y1={0} y2={5} stroke={palette[s.source]} strokeWidth={0.5} />
                  <line y1={0} y2={0} x1={0} x2={5} stroke={palette[s.target]} strokeWidth={0.5} />
                  <title>{`From ${s.source} to ${s.target} – ${s.count} `}</title>
                </motion.g>
              )
            })}
          </AnimatePresence>
        </g>
      </svg>
      <Tooltip isVisible={hoveredQuantile}>
        <p>
          {lineChartMode} {hoveredQuantile?.bucketValue}
        </p>
        {/* <p>Bucket {hoveredQuantile?.distribution}</p> */}
        {/* <p>{hoveredQuantile?.totalPoints} total</p>
        <p>Span {hoveredQuantile?.rawSpan}</p>*/}
        <p>{hoveredQuantile?.uniqueBucketPoints} un ind.</p>
        <p>{hoveredQuantile?.bucketPoints} ind.</p>
      </Tooltip>

      <div>
        <Button size="xs" onClick={handleZoomIn}>
          <ZoomIn size={16} />
        </Button>
        <Button size="xs" onClick={handleZoomOut}>
          <ZoomOut size={16} />
        </Button>
        <h4>Cell width: {zoomLevels[zoomStep]} individual</h4>
        <h4>{zoomStep} zoom</h4>
      </div>
    </div>
  )
}

function LineChart({ width, height, points }) {
  const xExtent = extent(points.map((p) => p.x))
  const xScale = scaleLinear(xExtent, [0, width])

  const yExtent = extent(points.map((p) => p.y))
  const yScale = scaleLinear([0, yExtent[1]], [height, 2])

  const lineBuilder = line()
    .curve(curveStep)
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))

  const linePath = lineBuilder(points)

  return (
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      exit={{ pathLength: 0 }}
      opacity={0.3}
      transition={{ duration: 0.8, delay: 0 }}
      d={linePath}
      stroke="red"
      fill="none"
      strokeWidth={0.3}
    />
  )
}

function Quantiles({ width, height, points, buckets, quantileScale, setHoveredQuantile }) {
  console.log(width)
  const xScale = scaleLinear([0, 1], [0, width])
  const yScale = scaleLinear([0, 1], [0, height])

  const uniquePoints = uniq(flatten(points, (p) => Math.floor(p)))
  const quantilesCount = countBy(points, (p) => quantileScale(p))
  const uniqueQuantilesCount = countBy(uniquePoints, (p) => quantileScale(p))

  const maximum = points.length
  const Qmaximum = sum(values(uniqueQuantilesCount))

  const counts = buckets.map((b) => uniqueQuantilesCount[b] ?? 0)
  const cumulative = counts.reduce((acc, c, i) => {
    acc.push((acc[i - 1] ?? 0) + c)
    return acc
  }, [])

  return (
    <g>
      {buckets.map((b, i) => {
        const x = xScale((cumulative[i - 1] ?? 0) / Qmaximum)
        const count = uniqueQuantilesCount[b] ?? 0
        const barWidth = xScale(count / Qmaximum)

        const quantileCount = quantilesCount[b]
        const barHeight = yScale(quantileCount / maximum)

        return (
          <motion.rect
            key={i}
            x={x}
            y={height - barHeight}
            color={"var(--surface-accent)"}
            animate={{ opacity: 1, fill: `oklch(from currentColor calc(l - ${i * 0.08}) c h)` }}
            width={barWidth}
            height={barHeight}
            whileHover={{ opacity: 0.5 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            onClick={() => console.log(counts)}
            onMouseEnter={() =>
              setHoveredQuantile({
                bucketValue: b,
                distribution: quantilesCount,
                bucketPoints: quantileCount,
                uniqueBucketPoints: count,
                // totalPoints: points.length,
                // rawSpan: rawSpan,
              })
            }
            onMouseLeave={() => setHoveredQuantile(null)}
          />
        )
      })}
    </g>
  )
}

function getCouplesFromAllStates(silhouetteStates) {
  return silhouetteStates.flatMap((seq) => {
    // Handle empty arrays
    if (seq.length === 0) return []

    // Handle single-state arrays: [0] -> [[0, 0]]
    if (seq.length === 1) return [[seq[0], seq[0]]]

    // Handle multi-state arrays: [0, 1, 2] -> [[0, 1], [1, 2]]
    const couples = []
    for (let i = 0; i < seq.length - 1; i++) {
      couples.push([seq[i], seq[i + 1]])
    }
    return couples
  })
}
