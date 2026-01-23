import { FilterDistribution } from "./UI/FilterDistribution"
import { FilterSlider } from "./UI/FilterSlider"

const Dates = (props) => {
  const { date, dateRange, setDateRange, sliderDimensions, allYears } = props

  const handleRangeChange = (value) => {
    setDateRange?.(value)
  }

  const min = date?.extent?.[0] || 0
  const max = date?.extent?.[1] || 100

  return (
    <div id="dates" className="filter-box" data-state={`${date.active ? "active" : "inactive"}`}>
      <p>Dates</p>

      <FilterDistribution
        data={allYears}
        width={sliderDimensions.x}
        height={50}
        extentX={date.extent}
        range={dateRange}
        maskID={"mask-dates"}
      />

      <FilterSlider
        min={min}
        max={max}
        value={dateRange}
        onChange={handleRangeChange}
        width={sliderDimensions.x}
        hasPattern={true}
        // hasRange={true}
      />
    </div>
  )
}

export default Dates
