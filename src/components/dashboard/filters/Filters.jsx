import { isNil, isEmpty } from "lodash"

import { FilterWrapper } from "./UI/FilterWrapper"

import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { min, max, extent } from "d3"

import "./Filters.css"
import StackedLines from "./StackedLines/StackedLines"
import { useRef, useState } from "react"
import Button from "../../common/Button/Button"
import { Dialog } from "../../common/Dialog/Dialog"
import { PipelineFlow } from "../pipeline-flow/PipelineFlow"

export const Filters = () => {
  const { data, filteredData, IDsFromSelectedSilhouettes, trajectories, filters } = useDerivedData()

  // isPipelineDialogOpen gates mounting <PipelineFlow />: React Flow needs a
  // sized, laid-out container when it initializes, and a closed <dialog> is
  // display:none, so mounting it unconditionally as a permanent child would
  // break fitView. Mount it fresh each time the dialog actually opens instead.
  const pipelineDialogRef = useRef(null)
  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false)

  const sliderDimensions = { x: 150, y: 30 }

  const selectedData =
    IDsFromSelectedSilhouettes.length > 0
      ? filteredData.filter((d) => IDsFromSelectedSilhouettes.includes(d.FINNGENID))
      : filteredData

  if (isEmpty(filters)) return null

  // const allYears = flattenDeep(data.map((d) => d.years))

  const allMinYears = data.map((t) => min(t.years))
  const allMaxYears = data.map((t) => max(t.years))

  const allYears = { all: [...allMinYears, ...allMaxYears], min: allMinYears, max: allMaxYears }

  const allDurations = data
    .map((d) => d.diseaseDuration)
    .filter((duration) => !isNil(duration))
    .filter((duration) => duration !== 0)

  const allSpeeds = trajectories
    .flat()
    .map((d) => d.speed)
    .filter((speed) => !isNil(speed))

  return (
    <section id="filters" className="filters">
      <div className="filter-wrapper">
        <div className="filter-bg">
          <StackedLines
            data={selectedData}
            extent={extent(allYears.all)}
            width={150}
            height={150}
          />
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
        </div>

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
        {filters.speed && (
          <FilterWrapper
            name={"speed"}
            title={"Segment Duration"}
            sliderDimensions={sliderDimensions}
            filter={filters.speed}
            allPoints={allSpeeds}
            hasPattern={false}
            hasDoubleHandle={true}
          />
        )}
        <Button
          size="xs"
          onClick={() => {
            setIsPipelineDialogOpen(true)
            pipelineDialogRef.current?.showModal()
          }}
          tooltip="Show the data pipeline"
        >
          Pipeline
        </Button>
        <Dialog
          ref={pipelineDialogRef}
          onClose={() => setIsPipelineDialogOpen(false)}
          title={"Filters pipeline"}
        >
          {isPipelineDialogOpen && <PipelineFlow />}
        </Dialog>
      </div>
    </section>
  )
}
