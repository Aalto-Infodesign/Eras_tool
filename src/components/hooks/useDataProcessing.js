import { useMemo } from "react"

import { max, range, quantile, groups, extent, descending, sort } from "d3"
import { similarity } from "../../utils/levenshteinDistance"
import { cleanTrajectories } from "../../utils/cleanTrajectories"
import { keyBy, snakeCase } from "lodash"

export function useDataCleanup(sourceData, statesThresholds) {
  const cleanData = useMemo(() => {
    if (!sourceData) return []

    console.log("sourceData", sourceData)
    console.log("statesThresholds", statesThresholds)

    if (!statesThresholds.length) return sourceData

    return cleanTrajectories(sourceData, statesThresholds)
  }, [sourceData, statesThresholds])

  const richData = useMemo(() => {
    if (!cleanData.length) return []
    console.time("Enrich")

    console.log("cleanData", cleanData)

    const richData = cleanData
      .filter((datum) => datum.trajectory.length > 0)
      .map((datum) => ({
        ...datum,
        // trajectoryOG: datum.trajectory,
        years: datum.years.map((y) => +y),
        trajectory: datum.trajectory.map((t) => snakeCase(t)),
        // trajectory: datum.trajectory.map((t) => scales.nameToIndex(t)),
        diseaseDuration: datum.diseaseDuration ?? 0,
        // trajectoryIndexes: datum.trajectory.map((t) => statesScaleIndexes(t)),
        // years: datum.SwitchEventAge.map((age) => age + startYear),
      }))

    // Edit based on Couple of States Thresholds

    console.log("richData", richData)

    console.timeEnd("Enrich")

    return richData
  }, [cleanData])

  return richData
}

export function useStates(data) {
  return useMemo(() => {
    if (!data?.length) return { statesData: [], analytics: [], trajectories: [] }
    console.time("States Data")
    // Extracting States from Dataset

    console.time("States")
    // Build a lookup map in one pass
    const stateMap = new Map()

    data.forEach((person) => {
      person.trajectory.forEach((state, index) => {
        if (!stateMap.has(state)) {
          stateMap.set(state, {
            population: [],
            otherStates: new Set(),
          })
        }

        const stateData = stateMap.get(state)
        stateData.population.push(person)

        // Track other states this person visited
        person.trajectory.forEach((s) => {
          if (s !== state) stateData.otherStates.add(s)
        })
      })
    })

    // Transform into your desired structure
    const states = Array.from(stateMap.entries()).map(([stateName, data]) => ({
      name: stateName,
      population: data.population,
      population_size: data.population.length,
      permanence_distribution: data.population.map((individual) =>
        individual.trajectory
          .reduce((a, e, i) => (e === stateName && a.push(i), a), [])
          .map((index) =>
            index + 1 !== individual.SwitchEventAge.length
              ? individual.SwitchEventAge[index + 1] - individual.SwitchEventAge[index]
              : "final_state",
          ),
      ),
      wheel: Array.from(data.otherStates),
      quantiles: {},
    }))
    console.timeEnd("States")

    console.time("Linear Combo Optimized")

    // Pre-calculate once
    const maxTrajectoryLength = Math.max(...data.map((d) => d.trajectory.length))
    const trajectorySlots = Array.from({ length: maxTrajectoryLength + 1 }, (_, i) => i)

    // Build frequency matrix in ONE pass through data
    const frequencyMap = new Map()

    data.forEach((individual) => {
      individual.trajectory.forEach((state, slotIndex) => {
        if (!frequencyMap.has(state)) {
          frequencyMap.set(state, new Array(trajectorySlots.length).fill(0))
        }
        frequencyMap.get(state)[slotIndex]++
      })
    })

    // Convert to your format
    const linearCombinations = states.map((state) => ({
      state: state.name,
      frequencies: frequencyMap.get(state.name) || new Array(trajectorySlots.length).fill(0),
    }))

    // Attach frequencies directly
    states.forEach((state) => {
      state.frequencies = frequencyMap.get(state.name) || new Array(trajectorySlots.length).fill(0)
    })

    const statesNamesSorted = dynamicSortLC(linearCombinations, trajectorySlots).map(
      (lc) => lc.state,
    )

    console.table("LC", linearCombinations)
    const statesSorted = dynamicSortLC(states, trajectorySlots)

    console.timeEnd("Linear Combo Optimized")

    console.time("Perm")
    const allPermanences = statesSorted
      .map((d) => d.permanence_distribution)
      .flat()
      .flat()
      .filter((e) => e !== "final_state")
    console.timeEnd("Perm")

    //TODO :
    //  move to another component
    //  so that quants are editable

    console.time("Quantiles Buckets")
    /**
 * 
    const quantilesNumber = 4
    const quantiles = Array.from({ length: quantilesNumber }, (_, i) => quantile(allPermanences, i))

    statesSorted.forEach((state) => {
      const counts = new Array(quantilesNumber).fill(0)

      state.permanence_distribution.flat().forEach((pd) => {
        if (typeof pd !== "number") return

        // Find which bucket (non-cumulative)
        for (let i = 0; i < quantiles.length; i++) {
          if (i === 0) {
            if (pd <= quantiles[i]) {
              counts[i]++
              break
            }
          } else {
            if (pd > quantiles[i - 1] && pd <= quantiles[i]) {
              counts[i]++
              break
            }
          }
        }
      })

      counts.forEach((count, n) => {
        state.quantiles[`quantile_${n}`] = count
      })
    })

 */

    console.timeEnd("Quantiles Buckets")

    // const longestPath = max(richData, (d) => d.trajectory.length)

    const statesData = {
      statesNames: statesNamesSorted,
      statesObject: keyBy(statesSorted, (s) => s.name),
      states: statesSorted,
    }

    // console.log("STATES NAMES", statesNamesSorted)

    console.timeEnd("States Data")
    return statesData
  }, [data.length])
}

export const useAnalytics = (data) => {
  const analytics = useMemo(
    () => ({
      datapoints: data.length,
      ageRange: extent(data.map((datum) => datum.SwitchEventAge).flat()),
      dateRange: extent(data.map((datum) => datum.years).flat()),
    }),
    [data],
  )

  return analytics
}

export const useFiltersSetup = (data, trajectories, selection, filtersInverted) => {
  // Only re-runs when the source data or links actually change.
  const dataBounds = useMemo(() => {
    if (!data?.length) return null

    const links = trajectories.flat()
    console.time("Data Bounds Calculation")

    const columns = Object.keys(data[0])

    // Pre-calculate all extents here
    const dateActive = columns.includes("years")
    const dateExtent = dateActive
      ? extent(data.flatMap((e) => e.years).map((e) => Math.floor(+e)))
      : []

    const durationsActive = columns.includes("diseaseDuration")
    const durationExtent = durationsActive ? extent(data, (d) => Math.floor(d.diseaseDuration)) : []

    const ageActive = columns.includes("SwitchEventAge")
    const ageExtent = ageActive
      ? extent(data, (d) => (d.SwitchEventAge > 0 ? d.SwitchEventAge : null))
      : []

    const speedExtent = extent(links, (d) => d.speed)

    console.timeEnd("Data Bounds Calculation")

    return {
      date: { active: dateActive, extent: dateExtent },
      duration: { active: durationsActive, extent: durationExtent },
      age: { active: ageActive, extent: ageExtent },
      speed: { extent: speedExtent },
    }
  }, [data, trajectories])

  // Re-runs on every slider movement (selection change).
  const filters = useMemo(() => {
    if (!dataBounds) return {}

    return {
      date: {
        ...dataBounds.date,
        range: range(dataBounds.date.extent[0], dataBounds.date.extent[1]),
        selection: selection.date || dataBounds.date.extent,
        isActive: !!selection.date,
        isInverted: filtersInverted.date,
      },
      diseaseDuration: {
        ...dataBounds.duration,
        range: range(dataBounds.duration.extent[0], dataBounds.duration.extent[1]),
        selection: selection.diseaseDuration || dataBounds.duration.extent,
        isActive: !!selection.diseaseDuration,
        isInverted: filtersInverted.diseaseDuration,
      },
      age: {
        ...dataBounds.age,
        range: range(dataBounds.age.extent[0], dataBounds.age.extent[1]),
        selection: selection.age || dataBounds.age.extent,
        isActive: !!selection.age,
        isInverted: filtersInverted.age,
      },
      speed: {
        ...dataBounds.speed,
        range: range(dataBounds.speed.extent[0], dataBounds.speed.extent[1]),
        selection: selection.speed || dataBounds.speed.extent,
        isActive: !!selection.speed,
        isInverted: filtersInverted.speed,
      },
    }
  }, [dataBounds, selection, filtersInverted])

  return filters
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

export const useTrajectoriesFromData = (data) => {
  return useMemo(() => {
    if (data.length === 0) return []
    console.time("Trajectories Optimized v1")

    const trajectories = data.map((datum) => {
      const { FINNGENID, diseaseDuration, trajectory, years, SwitchEventAge } = datum
      const firstDate = years?.[0]
      const lastIndex = trajectory.length - 1

      const links = new Array(trajectory.length)

      for (let n = 0; n < trajectory.length; n++) {
        const isLast = n === lastIndex
        const state = trajectory[n]

        // Reuse variables to reduce lookups
        const sourceAge = SwitchEventAge[n]
        const targetAge = isLast ? sourceAge : SwitchEventAge[n + 1]

        const sourceState = state
        const targetState = isLast ? state : trajectory[n + 1]

        const sourceDate = years?.[n]
        const targetDate = isLast ? years?.[n] : years?.[n + 1]

        const speed = targetDate > sourceDate ? targetDate - sourceDate : sourceDate - targetDate

        links[n] = {
          id: FINNGENID,
          diseaseDuration,
          firstDate,
          source: {
            state: sourceState,
            date: sourceDate,
            age: sourceAge,
            x: sourceAge,
          },
          target: {
            state: targetState,
            date: targetDate,
            age: targetAge,
            x: targetAge,
          },
          speed: speed,
          lump: sourceState + "-" + targetState,
          initialState: n === 0,
          finalState: isLast,
        }
      }

      links.states = trajectory
      links.typology = trajectory.join("-")

      return links
    })
    console.timeEnd("Trajectories Optimized v1")

    return trajectories.filter((t) => t.length > 0)
  }, [data])
}

export const useSilhouettesFromTrajectories = (trajectories, idealSilhouettes, data) => {
  return useMemo(() => {
    console.time("Silhouettes")

    if (trajectories.length === 0) return []

    const grupedTrajectories = groups(trajectories, (t) => t.typology)

    const silhouettes = //t[0] = "name", t[1] = Array di Array (1 x trajectory)
      grupedTrajectories
        .map((t) => ({
          name: t[0],
          trajectories: t[1],
          states: t[1][0].states,
          // minMaxState: getPolygonCoordinates(t[1]),
          levenshteinDistance: idealSilhouettes
            ? max(idealSilhouettes.map((s) => similarity(s.split("-"), t[0].split("-"))))
            : 0,
          size: t[1].length,
          percentage: (t[1].length / data.length) * 100,
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
  }, [trajectories, idealSilhouettes, data])
}
