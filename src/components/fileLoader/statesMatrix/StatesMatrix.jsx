// Creates a matrix coupling the STATES (From - To)
// We need
// Per each couple,
// - the speed / duration (time between the two states
// - the number of times this couple appears in the silhouettes
import { useState, useMemo } from "react"
import { motion } from "motion/react"
import { extent, scaleBand, scaleLinear } from "d3"
import { groupBy, map, countBy } from "lodash"
import { useViz } from "../../../contexts/VizContext"
import { useData } from "../../../contexts/ProcessedDataContext"
import { ListFilter } from "lucide-react"

import { curveStep, line } from "d3"

const PADDING = 25

export function StatesMatrix({ width, height }) {
  const { statesData, statesOrder } = useData()
  const { palette } = useViz()
  const [lineChartMode, setLineChartMode] = useState("duration") // "duration" | "source" | "target"
  const [selectedCell, setSelectedCell] = useState(null)

  const matrixCouples = useMemo(
    () =>
      map(
        groupBy(statesData.links, (l) => [l.source.state, l.target.state]),
        (value, key) => ({
          id: key,
          source: key.split(",")[0],
          target: key.split(",")[1],
          segments: value,
          // durations: map(value, (v) => v.target.date - v.source.date),
          countedDurations: map(
            countBy(
              map(value, (v) => v.target.date - v.source.date),
              Math.floor,
            ),
            (v, k) => ({ x: Number(k), y: v }),
          ),
          // sourceDates: map(value, (v) => v.source.date),
          countedSourceDates: map(
            countBy(
              map(value, (v) => v.source.date),
              Math.floor,
            ),
            (v, k) => ({ x: Number(k), y: v }),
          ),
          // targetDates: map(value, (v) => v.target.date),
          countedTargetDates: map(
            countBy(
              map(value, (v) => v.target.date),
              Math.floor,
            ),
            (v, k) => ({ x: Number(k), y: v }),
          ),
          countedSourceAges: map(
            countBy(
              map(value, (v) => v.source.age),
              Math.floor,
            ),
            (v, k) => ({ x: Number(k), y: v }),
          ),
          countedTargetAges: map(
            countBy(
              map(value, (v) => v.target.age),
              Math.floor,
            ),
            (v, k) => ({ x: Number(k), y: v }),
          ),
          count: value.length,
        }),
      ),
    [statesData],
  )

  console.log(matrixCouples)

  const valuesExtent = extent(matrixCouples.map((c) => c.count))
  const opacityScale = scaleLinear([0, valuesExtent[1]], [0, 1])

  const xScale = scaleBand()
    .domain(statesOrder)
    .range([PADDING, width - PADDING])
    .padding(0.1)

  const yScale = scaleBand()
    .domain(statesOrder)
    .range([PADDING, height - PADDING])
    .padding(0.1)

  return (
    <div>
      {/* <h4>StatesMatrix</h4> */}
      <div className="matrix-controls">
        <ListFilter size={16} />
        <select value={lineChartMode} onChange={(e) => setLineChartMode(e.target.value)}>
          <option value="duration">Duration</option>
          <option value="source">Source</option>
          <option value="target">Target</option>
          <option value="sourceAge">Source Age</option>
          <option value="targetAge">Target Age</option>
        </select>
      </div>

      <svg className="matrix" width={width} height={height}>
        <g id="grid">
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
        </g>
        <g id="cells">
          {matrixCouples.map((s, i) => {
            const dataMap = {
              duration: s.countedDurations,
              source: s.countedSourceDates,
              target: s.countedTargetDates,
              sourceAge: s.countedSourceAges,
              targetAge: s.countedTargetAges,
            }

            const activePoints = dataMap[lineChartMode]

            const isSelected = selectedCell === s.id
            return (
              <motion.g
                key={s.id}
                initial={{
                  x: xScale(s.source),
                  y: yScale(s.target),
                  scale: 1,
                }}
                animate={{
                  x: xScale(s.source),
                  y: yScale(s.target),
                  scale: isSelected ? 1.1 : 1,
                }}
                onClick={() => setSelectedCell(isSelected ? null : s.id)}
              >
                <rect
                  width={xScale.bandwidth()}
                  height={yScale.bandwidth()}
                  fill="white"
                  fillOpacity={opacityScale(s.count)}
                  stroke="none"
                />
                <LineChart
                  width={xScale.bandwidth()}
                  height={yScale.bandwidth()}
                  points={activePoints}
                />
                <title>{`${s.id} – ${s.count}`}</title>
              </motion.g>
            )
          })}
        </g>
      </svg>
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
      opacity={0.5}
      transition={{ duration: 0.8, delay: 0 }}
      d={linePath}
      stroke="red"
      fill="none"
      strokeWidth={1}
    />
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
