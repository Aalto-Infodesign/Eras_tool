import { scaleLinear, scaleRadial, extent } from "d3"

const PADDING = 10

export function ScatterPlot({ data, width, height }) {
  console.log("ScatterPlot data", data)
  if (!data || data.length === 0) return

  // X Axis will be size
  const distancesExtent = extent(data.map((d) => d.levenshteinDistance))
  console.log("distancesExtent", distancesExtent)
  const xScale = scaleLinear()
    .domain(distancesExtent)
    .range([PADDING, width - PADDING])

  //Y Axis will be levenshteinDistance
  const sizesExtent = extent(data.map((d) => d.size))
  console.log("sizesExtent", sizesExtent)
  const yScale = scaleLinear()
    .domain(sizesExtent)
    .range([height - PADDING, PADDING])

  return (
    <div>
      <h4>Scatter Plot</h4>
      <svg id="scatter-plot" width={width} height={height} style={{ backgroundColor: "#ffffff" }}>
        {data.map((d) => {
          return (
            <circle
              key={d.name}
              cx={xScale(d.levenshteinDistance)}
              cy={yScale(d.size)}
              r={5}
              fill="steelblue"
              stroke="black"
              strokeWidth={1}
            >
              <title>{`Name: ${d.name}\nSize: ${d.size}\nLeveinshtein Distance: ${d.leveinshteinDistance}`}</title>
            </circle>
          )
        })}
      </svg>
    </div>
  )
}
