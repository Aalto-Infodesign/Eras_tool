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
