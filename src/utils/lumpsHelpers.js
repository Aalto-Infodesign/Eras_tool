import { useMemo } from "react"
import { extent, quantile } from "d3"
import { mapValues, groupBy, map, values } from "lodash"

// Weighted p-quantile of `valueFn(item)` weighted by `weightFn(item)`: sort by
// value, walk the cumulative weight, return the value where it first reaches
// `p` of the total. With p = 0.5 this is the weighted median.
function weightedQuantile(items, p, valueFn, weightFn) {
  if (items.length === 0) return undefined
  const arr = items.map((d) => ({ v: valueFn(d), w: weightFn(d) })).sort((a, b) => a.v - b.v)
  const total = arr.reduce((s, d) => s + d.w, 0)
  if (total <= 0) return arr[Math.min(arr.length - 1, Math.floor(arr.length * p))].v
  let acc = 0
  for (const d of arr) {
    acc += d.w
    if (acc >= total * p) return d.v
  }
  return arr[arr.length - 1].v
}

/**
 * Per-state aggregates for the lump lines / box plots. Each datum carries a
 * five-number summary of `source.x` in `quartiles` ({min, q1, median, q3, max});
 * `median` and `xExtent` are kept as top-level aliases for existing consumers.
 *
 * When `weightById` is a non-empty Map (trajectoryID → weight, e.g. represented
 * cluster size), the quantiles are weighted so they reflect the population each
 * link stands for. Extent is unaffected by weighting.
 */
export const useStatesDataFromLinks = (links, weightById) => {
  return useMemo(() => {
    if (links.length === 0) return []
    const weighted = weightById && weightById.size > 0
    return values(
      mapValues(groupBy(links, "source.state"), (stateItems, stateKey) => {
        const xs = map(stateItems, "source.x")
        const q = weighted
          ? (p) =>
              weightedQuantile(
                stateItems,
                p,
                (d) => d.source.x,
                (d) => weightById.get(d.id) ?? 1,
              )
          : (p) => quantile(xs, p)
        const xExtent = extent(xs)
        const median = q(0.5)

        return {
          state: stateKey,
          dateExtent: extent(map(stateItems, "source.date")),
          xExtent,
          median,
          quartiles: { min: xExtent[0], q1: q(0.25), median, q3: q(0.75), max: xExtent[1] },
          items: stateItems,
        }
      }),
    )
  }, [links, weightById])
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
        },
        target: {
          state: l.target,
          dateExtent: extent(map(l.links, "target.date")),
          xExtent: extent(map(l.links, "target.x")),
        },
      }
    })
  }, [lumps])
}
