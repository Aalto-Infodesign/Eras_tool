import { FilterDistribution } from "./FilterDistribution"
import { FilterSlider } from "./FilterSlider"
import { useFilters } from "../../../../contexts/FiltersContext"

export const FilterWrapper = ({
  name,
  title,
  filter,
  sliderDimensions,
  allPoints,
  hasPattern,
  hasDoubleHandle = false,
}) => {
  const { updateSelection } = useFilters()

  const handleRangeChange = (value) => {
    console.log(name)
    updateSelection(name, value)
  }

  const min = filter?.extent?.[0] || 0
  const max = filter?.extent?.[1] || 100

  return (
    <div
      id={`filter-${name}`}
      className="filter-box"
      data-state={`${filter.active ? "active" : "inactive"}`}
    >
      <p>{title}</p>

      <FilterDistribution
        data={allPoints}
        width={sliderDimensions.x}
        height={50}
        extentX={filter.extent}
        range={filter.selection}
        maskID={`mask-${name}`}
      />

      <FilterSlider
        min={min}
        max={max}
        value={filter.selection}
        onChange={handleRangeChange}
        width={sliderDimensions.x}
        hasPattern={hasPattern}
        hasRange={hasDoubleHandle}
      />
    </div>
  )
}
