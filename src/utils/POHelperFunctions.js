// Function to create the index pairs
export function getDominancePairs(arr) {
  const pairs = []
  // Start the loop from the second element (index 1)
  for (let i = 1; i < arr.length; i++) {
    // Create a pair of the current index and the previous index
    pairs.push([arr[i - 1], arr[i]])
  }
  return pairs
}
// Function to create the index pairs
export function getDominancePairsAndName(arr) {
  const pairs = []
  // Start the loop from the second element (index 1)
  for (let i = 1; i < arr.length; i++) {
    // Create a pair of the current index and the previous index
    const obj = {
      name: `${arr[i - 1]}${arr[i]}`,
      pair: [arr[i - 1], arr[i]],
    }
    pairs.push(obj)
  }
  return pairs
}

export function getDominancePairsSelf(names) {
  const pairs = []
  const dominatedNames = new Set() // Keep track of all names that were successfully dominated by another name

  const segment = (name) => (name === "" ? [] : name.split("-"))

  // 1. First Pass: Find all true dominance pairs (a is strictly dominated by b)
  for (let i = 0; i < names.length; i++) {
    for (let j = 0; j < names.length; j++) {
      // Skip comparing an element to itself for STICKT DOMINANCE
      if (i === j) continue

      const nameA = names[i]
      const nameB = names[j]
      const a = segment(nameA)
      const b = segment(nameB)

      // a is dominated by b if b starts with a and b is strictly longer
      // This is the original, asymmetric, and irreflexive logic.
      if (b.length > a.length && a.every((val, idx) => b[idx] === val)) {
        pairs.push([nameB, nameA])
        dominatedNames.add(nameA)
      }
    }
  }

  // 2. Second Pass: Find names that were not dominated by any other name (nameA)
  // These names represent the 'maximal' elements in this dominance relation.
  for (const name of names) {
    if (!dominatedNames.has(name)) {
      // If a name was not dominated by any other, add it paired with itself.
      pairs.push([name, name])
    }
  }

  return pairs
}
export function getDominancePairsSelfUpper(names) {
  const pairs = []
  const segment = (name) => (name === "" ? [] : name.split("-"))

  // 1. First Pass: Find all dominance pairs (shorter dominates longer)
  for (let i = 0; i < names.length; i++) {
    for (let j = 0; j < names.length; j++) {
      if (i === j) continue

      const nameA = names[i]
      const nameB = names[j]
      const a = segment(nameA)
      const b = segment(nameB)

      // a dominates b if a is a proper prefix of b (a is shorter)
      if (a.length < b.length && a.every((val, idx) => b[idx] === val)) {
        pairs.push([nameA, nameB]) // Invertito: nameA domina nameB
      }
    }
  }

  // 2. Find all names that have a dominator (are dominated by something)
  const dominatedNames = new Set()
  for (const [dominator, dominated] of pairs) {
    dominatedNames.add(dominated)
  }

  // 3. Add φ only for atomic elements (length 1, no prefix)

  let i = 0
  for (const name of names) {
    const segments = segment(name)
    // φ dominates only single-segment names that aren't dominated by anyone else
    if (segments.length === 1 && !dominatedNames.has(name)) {
      pairs.push(["φ" + i, name])
      i++
    }
  }

  return pairs
}

export function createCompletePO(arr, separator = "-", closingSymbol = "φ") {
  // This counter creates unique closing symbols (φ1, φ2, etc.) for each root element.
  let closingIndex = 0

  // Use flatMap to allow one element to produce multiple [dominant, element] pairs.
  return arr.flatMap((element) => {
    // 1. Find ALL potential dominants for the current element.
    const allDominants = arr.filter((potentialDominant) => {
      if (element === potentialDominant || potentialDominant.length <= element.length) {
        return false
      }
      return potentialDominant.split(separator).includes(element)
    })

    // 2. If there are no dominants, this element is a "root" of a branch.
    //    Create a closing pair for it with a unique closing symbol.
    if (allDominants.length === 0) {
      closingIndex++
      return [[closingSymbol + `${closingIndex}`, element]] // flatMap requires returning an array
    }

    // 3. If dominants were found, find the length of the SHORTEST one.
    const minLength = Math.min(...allDominants.map((d) => d.length))

    // 4. Filter the list to keep only those with that minimal length.
    const minimalDominants = allDominants.filter((d) => d.length === minLength)

    // 5. Create a pair for EACH minimal dominant.
    return minimalDominants.map((dominant) => [dominant, element])
  })
}

/**
 * Converts ReactFlow nodes and edges into a dominance edge list for POSET analysis
 * @param {Array} nodes - ReactFlow nodes array
 * @param {Array} edges - ReactFlow edges array
 * @returns {Array|null} - Array of [dominator, dominated] pairs or null if not a valid POSET
 */
// export function calculateDominanceArray(nodes, edges) {
//   if (!nodes || nodes.length === 0 || !edges || edges.length === 0) {
//     return null
//   }

//   // Exit if nodes contain duplicates based on data.value
//   const nameSet = new Set()
//   const hasDuplicates = nodes.some((node) => {
//     if (node.data?.value !== undefined) {
//       if (nameSet.has(node.data.value)) {
//         return true // Found duplicate
//       }
//       nameSet.add(node.data.value)
//     }
//     return false
//   })

//   if (hasDuplicates) {
//     console.warn("Duplicate nodes detected, cannot calculate dominance")
//     return null
//   }

//   // Create a map of node IDs to their labels/names
//   const nodeIdToName = new Map()
//   nodes.forEach((node) => {
//     // Use label from data, or fall back to id
//     nodeIdToName.set(node.id, node.data?.index || node.id)
//   })

//   // Build adjacency list for cycle detection
//   const adjacencyList = new Map()
//   nodes.forEach((node) => adjacencyList.set(node.id, []))

//   edges.forEach((edge) => {
//     if (adjacencyList.has(edge.source)) {
//       adjacencyList.get(edge.source).push(edge.target)
//     }
//   })

//   // Cycle detection using DFS
//   const visited = new Set()
//   const recStack = new Set()

//   function hasCycleDFS(nodeId) {
//     visited.add(nodeId)
//     recStack.add(nodeId)

//     for (const neighbor of adjacencyList.get(nodeId) || []) {
//       if (!visited.has(neighbor)) {
//         if (hasCycleDFS(neighbor)) return true
//       } else if (recStack.has(neighbor)) {
//         return true
//       }
//     }

//     recStack.delete(nodeId)
//     return false
//   }

//   // Check for cycles
//   for (const node of nodes) {
//     if (!visited.has(node.id)) {
//       if (hasCycleDFS(node.id)) {
//         console.warn("Graph contains a cycle - not a valid POSET")
//         return null
//       }
//     }
//   }

//   // Compute transitive closure to get all dominance relationships
//   const n = nodes.length
//   const nodeIdToIndex = new Map()
//   const indexToNodeId = new Map()

//   nodes.forEach((node, index) => {
//     nodeIdToIndex.set(node.id, index)
//     indexToNodeId.set(index, node.id)
//   })

//   // Initialize reachability matrix
//   const reachabilityMatrix = Array(n)
//     .fill(null)
//     .map(() => Array(n).fill(false))

//   // Add direct edges
//   edges.forEach((edge) => {
//     const sourceIdx = nodeIdToIndex.get(edge.source)
//     const targetIdx = nodeIdToIndex.get(edge.target)

//     if (sourceIdx !== undefined && targetIdx !== undefined) {
//       reachabilityMatrix[sourceIdx][targetIdx] = true
//     }
//   })

//   // Floyd-Warshall for transitive closure
//   for (let k = 0; k < n; k++) {
//     for (let i = 0; i < n; i++) {
//       for (let j = 0; j < n; j++) {
//         if (reachabilityMatrix[i][k] && reachabilityMatrix[k][j]) {
//           reachabilityMatrix[i][j] = true
//         }
//       }
//     }
//   }

//   // Build dominance pairs: [dominator, dominated]
//   // In a flowchart, if there's an edge A → B, then A dominates B
//   const dominancePairs = []

//   for (let i = 0; i < n; i++) {
//     for (let j = 0; j < n; j++) {
//       if (i !== j && reachabilityMatrix[i][j]) {
//         const dominatorName = nodeIdToName.get(indexToNodeId.get(i))
//         const dominatedName = nodeIdToName.get(indexToNodeId.get(j))
//         dominancePairs.push([dominatorName, dominatedName])
//       }
//     }
//   }

//   // Add φ nodes for root elements (nodes with no incoming edges)
//   const hasIncomingEdge = new Set()
//   edges.forEach((edge) => hasIncomingEdge.add(edge.target))

//   let phiIndex = 0
//   nodes.forEach((node) => {
//     if (!hasIncomingEdge.has(node.id)) {
//       const nodeName = nodeIdToName.get(node.id)
//       dominancePairs.push([`φ${phiIndex}`, nodeName])
//       phiIndex++
//     }
//   })

//   return dominancePairs
// }

export function calculateDominanceArray(nodes, edges) {
  if (!nodes?.length || !edges?.length) return null

  // 1. Map IDs to our key (node.data.value) and check for duplicates
  const nodeIdToValue = new Map()
  const valueSet = new Set()

  for (const node of nodes) {
    const val = node.data?.value

    if (val === undefined || val === null) {
      console.warn(`Node ${node.id} is missing data.value`)
      return null
    }

    if (valueSet.has(val)) {
      console.warn(`Duplicate value detected: ${val}. Cannot calculate dominance.`)
      return null
    }

    valueSet.add(val)
    nodeIdToValue.set(node.id, val)
  }

  // 2. Build adjacency list for Cycle Detection (DFS)
  const adj = new Map(nodes.map((n) => [n.id, []]))
  edges.forEach((edge) => {
    if (adj.has(edge.source)) adj.get(edge.source).push(edge.target)
  })

  const visited = new Set()
  const recStack = new Set()

  function hasCycle(u) {
    visited.add(u)
    recStack.add(u)
    for (const v of adj.get(u) || []) {
      if (!visited.has(v) && hasCycle(v)) return true
      if (recStack.has(v)) return true
    }
    recStack.delete(u)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
      console.warn("Graph contains a cycle - not a valid POSET")
      return null
    }
  }

  // 3. Compute Transitive Closure (Floyd-Warshall)
  const n = nodes.length
  const idToIndex = new Map(nodes.map((node, i) => [node.id, i]))
  const indexToValue = nodes.map((node) => nodeIdToValue.get(node.id))

  // Initialize reachability matrix
  const dist = Array.from({ length: n }, () => Array(n).fill(false))

  edges.forEach((edge) => {
    const u = idToIndex.get(edge.source)
    const v = idToIndex.get(edge.target)
    if (u !== undefined && v !== undefined) dist[u][v] = true
  })

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] && dist[k][j]) dist[i][j] = true
      }
    }
  }

  // 4. Build dominance pairs
  const dominancePairs = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && dist[i][j]) {
        dominancePairs.push([indexToValue[i], indexToValue[j]])
      }
    }
  }

  edges.forEach((e) => {
    dominancePairs.push([e.data.source.value, e.data.target.value])
  })

  // 5. Add φ nodes for roots (nodes with no incoming edges)
  const targets = new Set(edges.map((e) => e.target))
  let phiCount = 0

  nodes.forEach((node) => {
    if (!targets.has(node.id)) {
      dominancePairs.push([`φ${phiCount++}`, nodeIdToValue.get(node.id)])
    }
  })

  return dominancePairs
}
