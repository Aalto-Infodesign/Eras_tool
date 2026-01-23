// Creates a matrix coupling the STATES (From - To)
// We need
// Per each couple,
// - the speed / duration (time between the two states
// - the number of times this couple appears in the silhouettes

import { extent, scaleBand, scaleLinear } from "d3"
import { groupBy } from "lodash"
const PADDING = 25

export function StatesMatrix({ silhouettes, statesOrder, width, height, palette }) {
  console.log(silhouettes)
  const silhouetteStates = silhouettes.map((s) => s.states)

  const allCouples = getCouplesFromAllStates(silhouetteStates)
  const countedCouples = groupBy(allCouples, (i) => {
    return [i[0], i[1]]
  })

  const matrixCouples = Object.entries(countedCouples).map(([k, v]) => ({
    id: k,
    from: k.split(",")[0],
    to: k.split(",")[1],
    count: v.length,
  }))

  const valuesExtent = extent(matrixCouples.map((c) => c.count))

  const opacityScale = scaleLinear([0, valuesExtent[1]], [0, 1])

  console.log(matrixCouples)

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
      <h4>StatesMatrix</h4>

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
          {matrixCouples.map((s, i) => (
            <g key={s.id}>
              <rect
                x={xScale(s.from)}
                y={yScale(s.to)}
                width={xScale.bandwidth()}
                height={yScale.bandwidth()}
                fill="white"
                fillOpacity={opacityScale(s.count)}
                stroke="none"
              />
              <title>{`${s.id} – ${s.count}`}</title>
            </g>
          ))}
        </g>
      </svg>
    </div>
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
