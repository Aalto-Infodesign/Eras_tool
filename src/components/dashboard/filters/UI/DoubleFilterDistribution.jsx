import { useMemo } from "react"

import { countBy } from "lodash"
import { extent, line, curveStep, scaleLinear } from "d3"

import { DistributionPath } from "./DistributionPath"

export function DoubleFilterDistribution({
  data,
  width,
  height,
  extentX,
  range,
  maskID,
  color = "#fff",
  doubleLine = false,
}) {
  const { max, min } = data

  return (
    <div className="filter-distribution-wrapper">
      <svg className={"filter-distribution"} width={width} height={height}>
        <g>
          <g transform={`translate(${-10},0)`}>
            {/* <text y={height + 5} fill="white">
              {valueExtent[0]}
            </text> */}
            <text y={height + 5} fill="white">
              0
            </text>
            <text y={-5} fill="white">
              {valueExtent[1]}
            </text>
          </g>

          <g className="axis">
            <line x1={0} y1={height} x2={width} y2={height} stroke={color} strokeWidth={0.5} />
            <line x1={0} y1={0} x2={0} y2={height} stroke={color} strokeWidth={0.5} />
          </g>

          <DistributionPath
            data={max}
            range={range}
            color={color}
            maskID={maskID}
            height={height}
            xScale={xScale}
          />
        </g>
      </svg>
    </div>
  )
}
