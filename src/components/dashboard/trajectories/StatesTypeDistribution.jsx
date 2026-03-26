import { useContext } from "react"
import { TrajectoriesContext } from "../TrajectoriesContext"

import { scaleLinear, scaleRadial, extent } from "d3"
import { values, flatten, isNil } from "lodash"
import { AnimatePresence, motion } from "motion/react"

import { useViz } from "../../../contexts/VizContext"

import { useLinksAnalytics } from "../../hooks/useLinksAnalytics"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"

export function StateTypeDistribution(props) {
  const { filteredLinks, selectedLinks } = useDerivedData()
  const trajectoriesContext = useContext(TrajectoriesContext)
  const { h, marginTop, chartScales } = trajectoriesContext

  const { y } = chartScales

  const { setHoveredDistribution = () => {} } = props

  const completeLinksAnalytics = useLinksAnalytics(filteredLinks)
  const selectedLinksAnalytics = useLinksAnalytics(selectedLinks)

  const linksAnalytics = completeLinksAnalytics.map((item) => {
    const match = selectedLinksAnalytics.find((f) => f.state === item.state)
    return {
      state: item.state,
      complete: { initial: item.initialTrajectories, final: item.finalTrajectories },
      filtered: {
        initial: match?.initialTrajectories ?? [],
        final: match?.finalTrajectories ?? [],
      },
    }
  })

  const offsetX = 35
  const colDistance = 12
  const linePadding = 5
  const cometlength = 10

  const labelData = [
    { text: "Initial", x: -colDistance + offsetX },
    { text: "Final", x: colDistance + offsetX },
  ]
  const midPoint = labelData.reduce((a, c) => a + c.x, 0) / labelData.length

  const countedAllByState = flatten(
    values(linksAnalytics.map((d) => [d.complete.initial.length, d.complete.final.length])),
  )

  const statesExtent = extent(countedAllByState)

  const radius = scaleRadial(statesExtent, [0, 5])
  const distance = scaleLinear([0, statesExtent[1]], [0, cometlength])

  return (
    <g id="statesDistribution">
      <g id="grid">
        {labelData && (
          <g id="header">
            {labelData.map((d) => (
              <text
                key={`label-${d.text}`}
                className="distribution-label"
                x={d.x}
                y={2}
                fontSize={4}
                fill="var(--text-primary)"
                textAnchor="middle"
              >
                {d.text}
              </text>
            ))}
          </g>
        )}
        <line
          className="split-line"
          x1={midPoint}
          x2={midPoint}
          y1={linePadding}
          y2={h}
          stroke="var(--text-primary)"
          strokeWidth={0.2}
        />
      </g>

      <g id="distributions">
        <AnimatePresence>
          {linksAnalytics.map((s) => {
            return (
              <motion.g
                key={`complete-${s.state}`}
                id={`complete-${s.state}`}
                initial={{ y: y(s.state) + marginTop }}
                animate={{ y: y(s.state) + marginTop }}
                transition={{ duration: 0.2 }}
              >
                <CircleGroup
                  type="initial"
                  name={s.state}
                  filteredTrajectories={s.filtered.initial}
                  originalTrajectories={s.complete.initial}
                  radius={radius}
                  distance={distance}
                  offsetX={offsetX}
                  colDistance={-colDistance}
                  setHoveredDistribution={setHoveredDistribution}
                />
                <CircleGroup
                  type="final"
                  name={s.state}
                  filteredTrajectories={s.filtered.final}
                  originalTrajectories={s.complete.final}
                  radius={radius}
                  distance={distance}
                  offsetX={offsetX}
                  colDistance={colDistance}
                  setHoveredDistribution={setHoveredDistribution}
                />
              </motion.g>
            )
          })}
        </AnimatePresence>
      </g>
    </g>
  )
}

const CircleGroup = ({
  type,
  name,
  filteredTrajectories,
  originalTrajectories,
  radius,
  distance,
  offsetX,
  colDistance,
  setHoveredDistribution,
}) => {
  const { palette } = useViz()
  const { toggleSelectedTrajectory } = useFilters()
  const r1 = radius(originalTrajectories.length)
  const r2 = isNil(filteredTrajectories) ? 0 : radius(filteredTrajectories.length)
  const difference = isNil(filteredTrajectories)
    ? 10
    : originalTrajectories.length - filteredTrajectories.length
  const D = -distance(difference)
  const points = getTangentPoints(r1, r2, D)

  const ogIDs = originalTrajectories.map((s) => s.id)
  const IDs = filteredTrajectories.map((s) => s.id)

  return (
    <motion.g
      key={`states-density-${name}-${type}`}
      id={`states-density-${name}`}
      className="distribution-state"
      initial={{ x: offsetX }}
      animate={{ x: offsetX }}
      transition={{ duration: 0.2 }}
    >
      <motion.g id={`initial-${name}`} initial={{ x: colDistance }} animate={{ x: colDistance }}>
        {originalTrajectories.length > 0 && (
          <motion.circle
            id={`circle-${name}`}
            className=" distribution-circle"
            initial={{ r: r1 }}
            animate={{ r: r1 }}
            fill={palette[name]}
            strokeWidth={0.5}
            onClick={() => toggleSelectedTrajectory(ogIDs)}
            onMouseOver={() =>
              setHoveredDistribution({
                type: "IT",
                text: "Total: " + originalTrajectories.length,
                state: name,
              })
            }
            onMouseLeave={() =>
              setHoveredDistribution({
                type: "",
                text: "",
                state: "",
              })
            }
          />
        )}
        <AnimatePresence>
          {difference > 0 && (
            <g>
              <motion.polygon
                className="polygon-initial"
                initial={{ points: "0,0 0,0 0,0 0,0" }}
                animate={{ points: points }}
                exit={{ points: "0,0 0,0 0,0 0,0" }}
                fill={palette[name]}
                opacity={0.6}
              />
              <motion.circle
                key={`circle-${type}-${name}`}
                id={`circle-${type}-${name}`}
                className={`circle-${type} distribution-circle`}
                initial={{ r: 0, cx: 0 }}
                animate={{ r: r2, cx: D }}
                exit={{ r: 0, cx: 0 }}
                fill={palette[name]}
                strokeWidth={0.5}
                stroke={"var(--surface-contrast)"}
                onClick={() => toggleSelectedTrajectory(IDs)}
                onMouseOver={() =>
                  setHoveredDistribution({
                    type: "IS",
                    text: "Selected: " + filteredTrajectories.length,
                    state: name,
                  })
                }
                onMouseLeave={() =>
                  setHoveredDistribution({
                    type: "",
                    text: "",
                    state: "",
                  })
                }
              />
            </g>
          )}
        </AnimatePresence>
      </motion.g>
    </motion.g>
  )
}

function getTangentPoints(r2, r1, d) {
  if (r1 === 0) return "0,0 0,0 0,0 0,0"
  return `${d},-${r1} 0,-${r2} 0,${r2} ${d},${r1}`
}
