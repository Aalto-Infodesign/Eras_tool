import { flattenDeep, isNil } from "lodash"

import { FilterWrapper } from "./UI/FilterWrapper"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { motion } from "motion/react"
import { SlidersHorizontal } from "lucide-react"

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
    <motion.section
      key={"filters"}
      id="chart-filters"
      // initial={{ x: 100 }}
      animate={{ x: 200 }}
      whileHover={{ x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="bento-item filters"
    >
      <div>
        {/* <h3>Filters</h3> */}
        <div className="menu-btn">
          <SlidersHorizontal size={16} color="var(--surface-accent)" />
        </div>
      </div>
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
              hasDoubleHandle={true}
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
    </motion.section>
  )
}
