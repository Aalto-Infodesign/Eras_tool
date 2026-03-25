import { useMemo, useState } from "react"
import { scaleLinear } from "d3"
import { FilterDistribution } from "./FilterDistribution"
import { FilterSlider } from "./FilterSlider"
import { useFilters } from "../../../../contexts/FiltersContext"
import { Contrast, RefreshCcw } from "lucide-react"
import Button from "../../../common/Button/Button"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"

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
  const { updateSelection, resetFilter, toggleInvertFilter } = useFilters()
  const { filters } = useDerivedData()
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

  const selection = [
    Math.max(filter.selection[0], filter.extent[0]),
    Math.min(filter.selection[1], filter.extent[1]),
  ]

  return (
    <div
      id={`filter-${name}`}
      className="filter-box"
      data-state={`${filter.active ? "active" : "inactive"}`}
    >
      <div className="filter-header">
        <p>{title}</p>

        <div>
          <Button
            size="xs"
            tooltip={"Invert Filter"}
            tooltipPosition="left"
            onClick={() => toggleInvertFilter(name)}
            data-selected={filters[name].isInverted}
          >
            <Contrast size={10} />
          </Button>
          {filter.isActive && (
            <Button
              size="xs"
              tooltip={"Reset Filter"}
              tooltipPosition="left"
              onClick={() => resetFilter(name)}
            >
              <RefreshCcw size={10} />
            </Button>
          )}
        </div>
      </div>

      <FilterDistribution
        allPoints={allPoints}
        height={50}
        xScale={xScale}
        range={filter.range}
        selection={selection}
        maskID={`mask-${name}`}
        mode={mode}
        lineX={lineX}
        hoveredSvg={hoveredSvg}
        width={sliderDimensions.x}
        isInverted={filter.isInverted}
      />
      <FilterSlider
        min={min}
        max={max}
        value={selection}
        onChange={handleRangeChange}
        width={sliderDimensions.x}
        hasPattern={hasPattern}
        hasRange={hasDoubleHandle}
        mode={mode}
        xScale={xScale}
        setLineX={setLineX}
        hoveredSvg={hoveredSvg}
        setHoveredSvg={setHoveredSvg}
        isInverted={filter.isInverted}
      />
    </div>
  )
}
