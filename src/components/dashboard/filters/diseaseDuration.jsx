import { useState } from "react"

import { FilterDistribution } from "./UI/FilterDistribution"
import { FilterSlider } from "./UI/FilterSlider"

const DiseaseDuration = (props) => {
  const { diseaseDuration, durationRange, setDurationRange, sliderDimensions, allDurations } = props

  const handleRangeChange = (value) => {
    setDurationRange?.(value)
  }

  const min = diseaseDuration?.extent?.[0] || 0
  const max = diseaseDuration?.extent?.[1] || 100

  return (
    <div
      id="durations"
      className="filter-box"
      data-state={`${diseaseDuration.active ? "active" : "inactive"}`}
    >
      <p>Disease Duration</p>

      <FilterDistribution
        data={allDurations}
        width={sliderDimensions.x}
        height={50}
        extentX={diseaseDuration.extent}
        range={durationRange}
        maskID={"mask-duration"}
      />

      <FilterSlider
        min={min}
        max={max}
        value={durationRange}
        onChange={handleRangeChange}
        width={sliderDimensions.x}
        hasRange={true}
      />
    </div>
  )
}

export default DiseaseDuration
