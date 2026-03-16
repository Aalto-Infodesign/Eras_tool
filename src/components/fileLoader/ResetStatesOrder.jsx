import { isNil } from "lodash"
import { ClearButton } from "../common/Button/ClearButton"
import { areArraysEqual } from "../../utils/areArraysEqual"
import { useData } from "../../contexts/ProcessedDataContext"
import { useFilters } from "../../contexts/FiltersContext"

export const ResetStatesOrder = () => {
  const { statesOrder, setStatesOrder, statesData } = useData()
  const { setRemovedStates } = useFilters()

  const statesOrderOriginal = statesData.statesNames
  const isActive = !isNil(statesOrder) && !areArraysEqual(statesOrder, statesOrderOriginal)

  function resetState() {
    setStatesOrder(statesOrderOriginal)
    setRemovedStates([])
  }
  return (
    <ClearButton isActive={isActive} clearFunction={resetState}>
      Reset States
    </ClearButton>
  )
}
