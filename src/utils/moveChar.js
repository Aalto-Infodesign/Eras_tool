export function moveElementInArray(wholeArray, targetChar, direction, setFunction) {
  // Find the index of the target character
  const index = wholeArray.indexOf(targetChar)

  // Create a copy of the array to avoid modifying the original
  const result = [...wholeArray]

  // Handle "up" direction
  if (direction === "up") {
    const newIndex = index - 1

    // Return the original array if:
    // 1. The character doesn't exist in the array
    // 2. The character is already at the first position (can't move up further)

    if (index === -1 || index === 0) {
      return
    }

    // Swap the character with the one above it (index - 1)
    ;[result[index], result[newIndex]] = [result[newIndex], result[index]]
  }
  // Handle "down" direction
  else if (direction === "down") {
    const newIndex = index + 1

    // Return the original array if:
    // 1. The character doesn't exist in the array
    // 2. The character is already at the last position (can't move down further)

    if (index === -1 || index === result.length - 1) {
      return
    }

    // Swap the character with the one below it (index + 1)
    ;[result[index], result[newIndex]] = [result[newIndex], result[index]]
  }

  setFunction(result)
  return result
}
