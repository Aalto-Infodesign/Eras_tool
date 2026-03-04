import { isNil } from "lodash"
import { ClearButton } from "../common/Button/ClearButton"
import { areArraysEqual } from "../../utils/areArraysEqual"
import { useData } from "../../contexts/ProcessedDataContext"

export const ResetStatesOrder = () => {
  const { statesOrder, setStatesOrder, statesData } = useData()

  const statesOrderOriginal = statesData.statesNames.map((_t, i) => `${i}`)

  const isActive = !isNil(statesOrder) && !areArraysEqual(statesOrder, statesOrderOriginal)

  function resetState() {
    setStatesOrder(statesOrderOriginal)
  }
  return (
    <ClearButton isActive={isActive} clearFunction={resetState}>
      Reset Order
    </ClearButton>
  )
}
