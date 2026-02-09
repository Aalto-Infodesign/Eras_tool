// import Dates from "./DatesSlider"
import { ResetStatesOrder } from "./ResetStatesOrder"

import { flattenDeep, isNil } from "lodash"

import { FilterWrapper } from "./UI/FilterWrapper"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"

import "./Filters.css"

export const Filters = () => {
  const { richData } = useData()
  const { filters } = useFilters()
  const sliderDimensions = { x: 150, y: 30 }

  const allYears = flattenDeep(richData.map((d) => d.years))
  const allDurations = richData
    .map((d) => d.diseaseDuration)
    .filter((duration) => !isNil(duration))
    .filter((duration) => duration !== 0)

  return (
    <>
      <h3>Chart controls</h3>
      <section id="filters">
        <div className="filter-wrapper">
          {filters.date.active && (
            <FilterWrapper
              name={"date"}
              title={"Date"}
              sliderDimensions={sliderDimensions}
              filter={filters.date}
              allPoints={allYears}
              hasPattern={true}
            />
          )}
          {filters.diseaseDuration.active && (
            <FilterWrapper
              name={"diseaseDuration"}
              title={"Disease Duration"}
              sliderDimensions={sliderDimensions}
              filter={filters.diseaseDuration}
              allPoints={allDurations}
              hasPattern={false}
              hasDoubleHandle={false}
            />
          )}
        </div>

        <ResetStatesOrder />
      </section>
    </>
  )
}
