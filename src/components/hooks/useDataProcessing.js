import { useMemo } from "react"

import { max, range, quantile, groups, extent, descending, sort } from "d3"
import { similarity } from "../../utils/levenshteinDistance"

export function useDataProcessing(sourceData, scales, idealSilhouettes) {
  const richData = useMemo(() => {
    if (!sourceData || !sourceData.length) return []
    console.time("Enrich")

    const richData = sourceData
      .filter((datum) => datum.trajectory.length > 0)
      .map((datum) => ({
        ...datum,
        // trajectoryOG: datum.trajectory,
        years: datum.years.map((y) => +y),
        trajectory: datum.trajectory.map((t) => scales.nameToIndex(t)),
        // trajectoryIndexes: datum.trajectory.map((t) => statesScaleIndexes(t)),
        // years: datum.SwitchEventAge.map((age) => age + startYear),
      }))
    console.timeEnd("Enrich")

    return richData
  }, [sourceData])

  const { statesData, analytics, trajectories } = useMemo(() => {
    if (!richData?.length) return { statesData: [], analytics: [], trajectories: [] }
    console.time("States Data")
    // Extracting States from Dataset
    const states = richData
      .map((p) => p.trajectory)
      .flat()
      .filter((e, n, l) => l.indexOf(e) === n)
      .map((state) => ({
        name: state,
        population: richData.filter((d) => d.trajectory.includes(state)),
        population_size: richData.filter((d) => d.trajectory.includes(state)).length,
        permanence_distribution: richData
          .filter((d) => d.trajectory.includes(state))
          .map((individual) =>
            individual.trajectory
              .reduce((a, e, i) => (e === state && a.push(i), a), [])
              .map((index) =>
                index + 1 !== individual.SwitchEventAge.length
                  ? individual.SwitchEventAge[index + 1] - individual.SwitchEventAge[index]
                  : "final_state",
              ),
          ),
        wheel: richData
          .filter((d) => d.trajectory.includes(state))
          .map((d) => d.trajectory.filter((e) => e !== state))
          .flat()
          .filter((e, n, l) => l.indexOf(e) === n),
        quantiles: {},
      }))

    const statesNames = states.map((state) => state.name)

    const maxTrajectoryLength = max(richData.map((d) => d.trajectory.length))
    const trajectorySlots = range(0, maxTrajectoryLength + 1)
    const linearCombinations = statesNames.map((state) => {
      const lc = {
        state: state,
        frequencies: trajectorySlots.map((slot) => {
          return richData.filter((individual) => {
            return individual.trajectory
              .reduce((a, e, i) => {
                if (e === state) {
                  a.push(i)
                }
                return a
              }, [])
              .includes(slot)
          }).length
        }),
      }
      return lc
    })

    states.forEach(
      (state) =>
        (state.frequencies = linearCombinations.find((lc) => lc.state === state.name).frequencies),
    )

    const statesNamesSorted = dynamicSortLC(linearCombinations, trajectorySlots).map(
      (lc) => lc.state,
    )

    const statesSorted = dynamicSortLC(states, trajectorySlots)

    const allPermanences = statesSorted
      .map((d) => d.permanence_distribution)
      .flat()
      .flat()
      .filter((e) => e !== "final_state")

    //TODO :
    //  move to another component
    //  so that quants are editable

    const quantilesNumber = 4
    const quantiles = range(0, quantilesNumber).map((slice) => quantile(allPermanences, slice))

    statesSorted.forEach((state) => {
      quantiles.forEach((q, n) => {
        let result
        if (n === 0) {
          result = state.permanence_distribution.filter((pd) => pd <= q).length
        } else {
          result = state.permanence_distribution.filter(
            (pd) => pd <= q && pd >= quantiles[n - 1],
          ).length
        }
        state.quantiles["quantile_" + n] = result
      })
    })

    // const longestPath = max(richData, (d) => d.trajectory.length)

    const trajectories = richData.map((datum, i) => {
      const trajectory = datum.trajectory.map((state, n) => {
        const link = { source: { x: 0, state: "" }, target: { x: 0, state: "" } }
        link.id = datum.FINNGENID
        link.diseaseDuration = datum.diseaseDuration
        link.firstDate = datum.firstDate

        link.source.state = state
        link.source.date = datum?.years[n] | []
        link.source.x = datum.SwitchEventAge[n]
        link.source.age = datum.SwitchEventAge[n]
        link.initialState = n === 0
        link.firstDate = datum.years[0]
        if (n === datum.trajectory.length - 1) {
          link.target.state = state
          link.target.x = datum.SwitchEventAge[n]
          link.target.age = datum.SwitchEventAge[n]
          link.target.date = datum.years[n]
          link.finalState = true
        } else {
          link.target.state = datum.trajectory[n + 1]
          link.target.x = datum.SwitchEventAge[n + 1]
          link.target.age = datum.SwitchEventAge[n + 1]
          link.target.date = datum.years[n + 1]
          link.finalState = false
        }
        return link
      })
      trajectory.states = datum.trajectory

      trajectory.typology =
        datum.trajectory.length > 0
          ? datum.trajectory.reduce((typology, state) => typology + "-" + state)
          : ""
      return trajectory
    })

    const analytics = {
      datapoints: richData.length,
      ageRange: extent(richData.map((datum) => datum.SwitchEventAge).flat()),
      dateRange: extent(richData.map((datum) => datum.years).flat()),
      quantilesNumber: 4,
      stayLenQuants: quantiles,
    }

    const statesData = {
      statesNames: statesNamesSorted,
      states: statesSorted,
      links: trajectories.flat(),
    }

    console.timeEnd("States Data")
    return { statesData, analytics, trajectories }
  }, [richData])

  const silhouettes = useMemo(() => {
    if (trajectories.length === 0) return []
    console.time("Silhouettes")

    const grupedTrajectories = groups(trajectories, (t) => t.typology)

    const silhouettes = //t[0] = "name", t[1] = Array di Array (1 x trajectory)
      grupedTrajectories
        .map((t) => ({
          name: t[0],
          trajectories: t[1],
          states: t[1][0].states,
          // minMaxState: getPolygonCoordinates(t[1]),
          levenshteinDistance:
            idealSilhouettes.length > 0
              ? max(idealSilhouettes.map((s) => similarity(s.split("-"), t[0].split("-"))))
              : 0,
          size: t[1].length,
          percentage: (t[1].length / richData.length) * 100,
          trajectory: t[1][0].states.map((e, n) => ({
            source: e,
            target: n + 1 < t[1][0].length ? t[1][0].states[n + 1] : "fs",
          })),
          fs: t[1][0]?.at(-1)
            ? { x: t[1][0].length - 1, state: t[1][0].at(-1).source.state }
            : { x: 0, state: 0 },
          // 'fs':{'y':10, 'x':11}
        }))
        .sort((a, b) => descending(a.size, b.size))
    console.timeEnd("Silhouettes")
    return silhouettes
  }, [trajectories, idealSilhouettes])

  // Filters
  const filters = useMemo(() => {
    if (!richData?.length) return {}
    console.time("Filters")

    const columns = Object.keys(richData[0])

    const dateActive = columns.includes("years")
    const dateExtent = dateActive
      ? extent(
          richData
            .map((e) => e.years)
            .flat()
            .map((e) => parseInt(+e)),
        )
      : []
    const dateRange = dateActive ? range(dateExtent[0], dateExtent[1]) : []

    //.......diseaseDuration
    const durationsActive = columns.includes("diseaseDuration")
    const durationExtent = durationsActive
      ? extent(richData, (d) => (d.diseaseDuration > 0 ? d.diseaseDuration : null))
      : []
    const durationRange = range(durationExtent[0], durationExtent[1])

    //.... age
    const ageActive = columns.includes("SwitchEventAge")
    const ageExtent = ageActive
      ? extent(richData, (d) => (d.SwitchEventAge > 0 ? d.SwitchEventAge : null))
      : []
    const ageRange = range(ageExtent[0], ageExtent[1])

    const filters = {
      date: {
        active: dateActive,
        range: dateRange,
        extent: dateExtent,
      },
      diseaseDuration: {
        active: durationsActive,
        range: durationRange,
        extent: durationExtent,
      },
      age: {
        active: ageActive,
        range: ageRange,
        extent: ageExtent,
      },
    }

    console.timeEnd("Filters")
    return filters
  }, [richData])

  return { richData, statesData, analytics, silhouettes, filters }
}

function dynamicSortLC(data, conditions) {
  return sort(data, (a, b) => {
    for (const condition of conditions) {
      const result = descending(a.frequencies[condition], b.frequencies[condition])
      if (result !== 0) return result // Return the result as soon as a difference is found
    }
    return 0 // All conditions are equal
  })
}
