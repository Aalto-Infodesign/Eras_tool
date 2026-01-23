export function areArraysEqual(arr1, arr2) {
  // Quick length check first
  if (arr1.length !== arr2.length) {
    return false
  }

  // Compare elements one by one
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }

  return true
}
