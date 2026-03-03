import { useMemo } from "react"

import { max, range, quantile, groups, extent, descending, sort } from "d3"
import { similarity } from "../../utils/levenshteinDistance"
import { cleanTrajectories } from "../../utils/cleanTrajectories"

export function useDataCleanup(sourceData, scales, statesThresholds) {
  const cleanData = useMemo(() => {
    if (!sourceData) return []

    console.log("sourceData", sourceData)

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
        trajectory: datum.trajectory.map((t) => scales.nameToIndex(t)),
        diseaseDuration: datum.diseaseDuration ?? 0,
        // trajectoryIndexes: datum.trajectory.map((t) => statesScaleIndexes(t)),
        // years: datum.SwitchEventAge.map((age) => age + startYear),
      }))

    // Edit based on Couple of States Thresholds

    console.log("richData", richData)

    console.timeEnd("Enrich")

    return richData
  }, [cleanData, scales])

  return richData
}

export function useDataProcessing(richData, idealSilhouettes) {
  const { statesData, analytics, trajectories } = useMemo(() => {
    if (!richData?.length) return { statesData: [], analytics: [], trajectories: [] }
    console.time("States Data")
    // Extracting States from Dataset

    console.time("States")
    // Build a lookup map in one pass
    const stateMap = new Map()

    richData.forEach((person) => {
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
    const maxTrajectoryLength = Math.max(...richData.map((d) => d.trajectory.length))
    const trajectorySlots = Array.from({ length: maxTrajectoryLength + 1 }, (_, i) => i)

    // Build frequency matrix in ONE pass through data
    const frequencyMap = new Map()

    richData.forEach((individual) => {
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
    console.time("Trajectories Optimized v1")

    const trajectories = trajectoriesFromData(richData)
    console.timeEnd("Trajectories Optimized v1")

    const analytics = {
      datapoints: richData.length,
      ageRange: extent(richData.map((datum) => datum.SwitchEventAge).flat()),
      dateRange: extent(richData.map((datum) => datum.years).flat()),
      // quantilesNumber: 4,
      // stayLenQuants: quantiles,
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

    const silhouettes = silhouettesFromTrajectories(trajectories, idealSilhouettes, richData)
    return silhouettes
  }, [trajectories, idealSilhouettes])

  // Filters
  const filters = useMemo(() => {
    if (!richData?.length) return {}
    console.time("Filters")

    const columns = Object.keys(richData[0])

    // DATE
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

    // DISEASE DURATION
    const durationsActive = columns.includes("diseaseDuration")
    const durationExtent = durationsActive
      ? // ? extent(richData, (d) => (d.diseaseDuration > 0 ? d.diseaseDuration : null))
        extent(richData, (d) => d.diseaseDuration)
      : []
    const durationRange = range(durationExtent[0], durationExtent[1])

    // AGE
    const ageActive = columns.includes("SwitchEventAge")
    const ageExtent = ageActive
      ? extent(richData, (d) => (d.SwitchEventAge > 0 ? d.SwitchEventAge : null))
      : []
    const ageRange = range(ageExtent[0], ageExtent[1])

    // SPEED
    const links = statesData.links
    const speedExtent = extent(links, (d) => d.speed)

    const speedRange = range(speedExtent[0], speedExtent[1])

    const filters = {
      date: {
        active: dateActive,
        range: dateRange,
        extent: dateExtent,
        selection: dateExtent,
        isActive: false,
      },
      diseaseDuration: {
        active: durationsActive,
        range: durationRange,
        extent: durationExtent,
        selection: durationExtent,
        isActive: false,
      },
      age: {
        active: ageActive,
        range: ageRange,
        extent: ageExtent,
        selection: ageExtent,
        isActive: false,
      },
      speed: {
        range: speedRange,
        extent: speedExtent,
        selection: speedExtent,
        isActive: false,
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

export const trajectoriesFromData = (data) => {
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

  return trajectories
}

export const silhouettesFromTrajectories = (trajectories, idealSilhouettes, richData) => {
  console.time("Silhouettes")

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
}
