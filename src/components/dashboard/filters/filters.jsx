import Dates from "./dates"
// import Dates from "./DatesSlider"
import DiseaseDuration from "./diseaseDuration"
import { ResetStatesOrder } from "./ResetStatesOrder"

import { flattenDeep, isNil } from "lodash"

import "./Filters.css"

const Filters = ({
  data,
  filters,
  statesOrder,
  setStatesOrder,
  statesOrderOriginal,
  dateRange,
  setDateRange,
  durationRange,
  setDurationRange,
}) => {
  const sliderDimensions = { x: 150, y: 30 }

  const allYears = flattenDeep(data.map((d) => d.years))
  const allDurations = data
    .map((d) => d.diseaseDuration)
    .filter((duration) => !isNil(duration))
    .filter((duration) => duration !== 0)
  // const allAges = data.map((d) => d.SwitchEventAge).filter((age) => !isNil(age))

  // console.log(allYears)
  // console.log(allDurations)

  return (
    <>
      <h3>Chart controls</h3>
      <section id="filters">
        <div className="filter-wrapper">
          {filters.date.active && (
            <Dates
              sliderDimensions={sliderDimensions}
              date={filters.date}
              allYears={allYears}
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          )}
          {filters.diseaseDuration.active && (
            <DiseaseDuration
              sliderDimensions={sliderDimensions}
              diseaseDuration={filters.diseaseDuration}
              allDurations={allDurations}
              durationRange={durationRange}
              setDurationRange={setDurationRange}
            />
          )}
          {/* {filters.age.active && (
            <Age
              sliderDimensions={sliderDimensions}
              age={filters.age}
              allDurations={allDurations}
              durationRange={durationRange}
              setDurationRange={setDurationRange}
            />
          )} */}
        </div>

        <ResetStatesOrder
          statesOrder={statesOrder}
          setStatesOrder={setStatesOrder}
          statesOrderOriginal={statesOrderOriginal}
        />
      </section>
    </>
  )
}

export default Filters
