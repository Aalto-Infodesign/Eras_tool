import { isNil } from "lodash"
import { ClearButton } from "../../common/Button/ClearButton"
import { areArraysEqual } from "../../../utils/areArraysEqual"

export const ResetStatesOrder = (props) => {
  const { statesOrder, setStatesOrder } = props
  const { statesOrderOriginal } = props

  // const sortedOrder = !isNil(statesOrder) && [...statesOrder].sort()
  const isActive = !isNil(statesOrder) && !areArraysEqual(statesOrder, statesOrderOriginal)

  function resetState() {
    console.log(statesOrderOriginal)
    setStatesOrder(statesOrderOriginal)
  }
  return (
    <ClearButton isActive={isActive} clearFunction={resetState}>
      Reset Order
    </ClearButton>
  )
}
