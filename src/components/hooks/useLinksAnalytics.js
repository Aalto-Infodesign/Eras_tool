import { useMemo } from "react"
import { groupBy, mapValues, values, unionBy, sortBy } from "lodash"

function getInitialAndFinalPerState(linksByState) {
  return sortBy(
    values(
      mapValues(linksByState, (stateItems, stateKey) => ({
        state: stateKey,
        initialTrajectories: stateItems.filter((d) => d.initialState && d),
        finalTrajectories: stateItems.filter((d) => d.finalState && d),
      })),
    ),
    "state",
  )
}

export const useLinksAnalytics = (links) => {
  return useMemo(() => {
    const linksBySourceState = groupBy(links, "source.state")
    const linksByTargetState = groupBy(links, "target.state")

    const initialAndFinalPerStateSource = getInitialAndFinalPerState(linksBySourceState)
    const initialAndFinalPerStateTarget = getInitialAndFinalPerState(linksByTargetState)

    const unitedObjects = unionBy(
      initialAndFinalPerStateSource,
      initialAndFinalPerStateTarget,
      "state",
    )

    console.log(unitedObjects)

    return unitedObjects
  }, [links])
}
