import { median, extent } from "d3"
import { flattenDeep, mapValues, groupBy, map, flatMap, values } from "lodash"

export function getMinMaxStateFromTrajectories(trajectories) {
  // console.log("passedTrajectories", trajectories)

  const flattenedData = trajectories.map((d) => ({ id: d.id, ...d.source }))

  // console.log(flattenedData)

  const minMax = values(
    mapValues(groupBy(flattenedData, "state"), (stateItems, stateKey) => ({
      state: stateKey,
      date: extent(map(stateItems, "date")),
      x: extent(map(stateItems, "x")),
      median: median(flatMap(stateItems, "x")),
      items: stateItems,
    })),
  ).sort((a, b) => a - b)

  return minMax
}
export function getMinMaxFromTrajectoriesBetweenTwoStates(trajectories) {
  //   console.log("passedTrajectories", trajectories)

  //To every trajectory add a new parameter: type, which is the pairing of source state and target state

  // const trajectoriesWithType = trajectories.map(
  //   (t) =>
  //     t.source.state !== t.target.state && {
  //       ...t,
  //       type: t.source.state + t.target.state,
  //     }
  // )

  const trajectoriesWithType = trajectories.map((t) => ({
    ...t,
    type: t.source.state + "-" + t.target.state,
  }))

  const trajectoriesByType = groupBy(trajectoriesWithType, "type")

  // console.log(trajectoriesByType)

  const minMax = mapValues(trajectoriesByType, (stateItems, stateKey) => ({
    type: stateKey,
    diseaseDuration: extent(map(stateItems, "diseaseDuration")),
    source: {
      state: stateKey.split("-")[0],
      date: extent(map(stateItems, "source.date")),
      x: extent(map(stateItems, "source.x")),
      //   median: median(flatMap(stateItems, "source.x")),
    },
    target: {
      state: stateKey.split("-")[1],
      date: extent(map(stateItems, "target.date")),
      x: extent(map(stateItems, "target.x")),
      //   median: median(flatMap(stateItems, "target.x")),
    },
    items: stateItems,
  }))

  //   console.log("minMax", minMax)

  return values(minMax)
}

export function getTrajectoriesFromMinMax(minMaxGroups) {
  // Each minMaxGroup contains an 'items' property that stores the original trajectories
  // We need to flatten all these items arrays into a single array of trajectories

  // Use flatMap to extract and flatten all trajectory items from each group
  const trajectories = minMaxGroups.flatMap((group) => group.items || [])

  return trajectories
}

function getMinMax(data) {
  const minMax = values(
    mapValues(groupBy(data, "state"), (stateItems, stateKey) => ({
      state: stateKey,
      date: extent(map(stateItems, "date")),
      x: extent(map(stateItems, "x")),
      median: median(flatMap(stateItems, "x")),
      items: stateItems,
    })),
  )

  return minMax
}
