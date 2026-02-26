import { useMemo } from "react"

import { countBy } from "lodash"
import { extent, scaleLinear } from "d3"

import { DistributionPath } from "./DistributionPath"

export function FilterDistribution({
  data,
  width,
  height,
  extentX,
  range,
  maskID,
  color = "#fff",
  mode = "single",
  xScale,
}) {
  const dataToCount = mode === "double" ? data.all : data

  // Prepare data
  const dataCount = useMemo(
    () =>
      Object.entries(countBy(dataToCount, Math.floor)).map((e) => ({
        x: e[0],
        y: e[1],
      })),
    [data],
  )

  const valueExtent = useMemo(() => extent(dataCount, (c) => c.y), [dataCount])

  const yScale = useMemo(
    () => scaleLinear([0, valueExtent[1]], [height, 0]),
    [data, valueExtent, height],
  )

  const sharedPathProps = { range, height, xScale, yScale, extentX, width }

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

          {mode === "double" ? (
            <g>
              <DistributionPath
                data={data.min}
                color={"blue"}
                maskID={maskID + "-min"}
                {...sharedPathProps}
              />
              <DistributionPath
                data={data.max}
                color={"red"}
                maskID={maskID + "-max"}
                {...sharedPathProps}
              />
            </g>
          ) : (
            <DistributionPath data={data} color={color} maskID={maskID} {...sharedPathProps} />
          )}
        </g>
      </svg>
    </div>
  )
}
