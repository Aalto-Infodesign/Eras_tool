import { useMemo } from "react"
import { median, extent } from "d3"
import { mapValues, groupBy, map, flatMap, values } from "lodash"

export const useStatesDataFromLinks = (links) => {
  return useMemo(() => {
    if (links.length === 0) return []
    return values(
      mapValues(groupBy(links, "source.state"), (stateItems, stateKey) => ({
        state: stateKey,
        dateExtent: extent(map(stateItems, "source.date")),
        xExtent: extent(map(stateItems, "source.x")),
        median: median(flatMap(stateItems, "source.x")),
        items: stateItems,
      })),
    ).sort((a, b) => a - b)
  }, [links])
}
// TODO Can be merged to useLumps
export const useLumpsData = (lumps) => {
  return useMemo(() => {
    if (lumps.length === 0) return []
    return lumps.map((l) => {
      return {
        ...l,
        source: {
          state: l.source,
          dateExtent: extent(map(l.links, "source.date")),
          xExtent: extent(map(l.links, "source.x")),
          //   median: median(flatMap(l.links, "source.x")),
        },
        target: {
          state: l.target,
          dateExtent: extent(map(l.links, "target.date")),
          xExtent: extent(map(l.links, "target.x")),
          //   median: median(flatMap(stateItems, "target.x")),
        },
      }
    })
  }, [lumps])
}
