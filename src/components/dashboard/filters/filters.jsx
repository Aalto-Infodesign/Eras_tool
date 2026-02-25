import { isNil, isEmpty } from "lodash"

import { FilterWrapper } from "./UI/FilterWrapper"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { min, max } from "d3"

import "./Filters.css"

export const Filters = () => {
  const { richData } = useData()
  const { filters } = useFilters()
  const sliderDimensions = { x: 150, y: 30 }

  if (isEmpty(filters)) return null

  // const allYears = flattenDeep(richData.map((d) => d.years))

  const allMinYears = richData.map((t) => min(t.years))
  const allMaxYears = richData.map((t) => max(t.years))

  const allYears = { all: [...allMinYears, ...allMaxYears], min: allMinYears, max: allMaxYears }

  const allDurations = richData
    .map((d) => d.diseaseDuration)
    .filter((duration) => !isNil(duration))
    .filter((duration) => duration !== 0)

  return (
    <section id="filters" className="filters">
      <div className="filter-wrapper">
        {filters.date.active && (
          <FilterWrapper
            name={"date"}
            title={"Date"}
            sliderDimensions={sliderDimensions}
            filter={filters.date}
            allPoints={allYears}
            hasPattern={false}
            hasDoubleHandle={true}
            mode="double"
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
            hasDoubleHandle={true}
          />
        )}
      </div>
    </section>
  )
}
