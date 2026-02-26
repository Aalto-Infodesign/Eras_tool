import { useMemo, useState } from "react"
import { scaleLinear } from "d3"
import { FilterDistribution } from "./FilterDistribution"
import { FilterSlider } from "./FilterSlider"
import { useFilters } from "../../../../contexts/FiltersContext"
import { RefreshCcw } from "lucide-react"
import Button from "../../../common/Button/Button"

export const FilterWrapper = ({
  name,
  title,
  filter,
  sliderDimensions,
  allPoints,
  hasPattern,
  hasDoubleHandle = false,
  mode = "single",
}) => {
  const { updateSelection, resetFilter } = useFilters()
  const [lineX, setLineX] = useState(0)
  const [hoveredSvg, setHoveredSvg] = useState(false)

  const handleRangeChange = (value) => {
    console.log(name)
    updateSelection(name, value)
  }

  const min = filter?.extent?.[0] || 0
  const max = filter?.extent?.[1] || 100

  const xScale = useMemo(
    () => scaleLinear(filter.extent, [0, sliderDimensions.x]),
    [filter, sliderDimensions],
  )

  return (
    <div
      id={`filter-${name}`}
      className="filter-box"
      data-state={`${filter.active ? "active" : "inactive"}`}
    >
      <div className="filter-header">
        <p>{title}</p>

        {filter.isActive && (
          <Button size="small" onClick={() => resetFilter(name)}>
            <RefreshCcw size={10} />
          </Button>
        )}
      </div>

      <FilterDistribution
        data={allPoints}
        height={50}
        xScale={xScale}
        range={filter.selection}
        maskID={`mask-${name}`}
        mode={mode}
        lineX={lineX}
        hoveredSvg={hoveredSvg}
      />
      <FilterSlider
        min={min}
        max={max}
        value={filter.selection}
        onChange={handleRangeChange}
        width={sliderDimensions.x}
        hasPattern={hasPattern}
        hasRange={hasDoubleHandle}
        mode={mode}
        xScale={xScale}
        setLineX={setLineX}
        hoveredSvg={hoveredSvg}
        setHoveredSvg={setHoveredSvg}
      />
    </div>
  )
}
