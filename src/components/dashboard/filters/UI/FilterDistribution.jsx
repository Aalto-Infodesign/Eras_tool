import { useMemo } from "react"
import { countBy } from "lodash"
import { extent, scaleLinear } from "d3"

import { DistributionPath } from "./DistributionPath"

export function FilterDistribution({
  allPoints,
  width,
  height,
  range,
  selection,
  maskID,
  color = "#fff",
  mode = "single",
  xScale,
  lineX,
  hoveredSvg,
}) {
  const dataToCount = mode === "double" ? allPoints.all : allPoints

  // Prepare data
  const { dataCount } = useMemo(() => {
    const countedBy = countBy(dataToCount, Math.floor)

    const dataCount = Object.entries(countedBy).map((e) => ({
      x: e[0],
      y: e[1],
    }))

    return { dataCount, countedBy }
  }, [dataToCount])

  const valueExtent = useMemo(() => extent(dataCount, (c) => c.y), [dataCount])

  const yScale = useMemo(() => scaleLinear([0, valueExtent[1]], [height, 0]), [valueExtent, height])

  const sharedPathProps = {
    range,
    selection,
    height,
    xScale,
    yScale,
    width,
    lineX,
    hoveredSvg,
  }

  return (
    <div className="filter-distribution-wrapper">
      <svg className={"filter-distribution"} width={width} height={height}>
        <g>
          <g transform={`translate(${-10},0)`}>
            <text y={height + 5} fontSize={10} fill="white">
              0
            </text>
            <text y={-5} fontSize={10} fill="white">
              {valueExtent[1]}
            </text>
          </g>

          <g className="axis">
            <line x1={0} y1={height} x2={width} y2={height} stroke={color} strokeWidth={0.5} />
            <line x1={0} y1={0} x2={0} y2={height} stroke={color} strokeWidth={0.5} />
          </g>

          {mode === "double" ? (
            <g>
              <DistributionPath
                data={allPoints.min}
                color={"#fff"}
                maskID={maskID + "-min"}
                {...sharedPathProps}
              />
              <DistributionPath
                data={allPoints.max}
                color={"var(--surface-accent-dark)"}
                maskID={maskID + "-max"}
                {...sharedPathProps}
              />
            </g>
          ) : (
            <DistributionPath data={allPoints} color={color} maskID={maskID} {...sharedPathProps} />
          )}
        </g>
      </svg>
    </div>
  )
}
