import { isNil } from "lodash"
import { ClearButton } from "../common/Button/ClearButton"
import { areArraysEqual } from "../../utils/areArraysEqual"
import { useViz } from "../../contexts/VizContext"

export const ResetStatesOrder = () => {
  const { statesOrder, setStatesOrder, statesOrderOriginal } = useViz()

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
