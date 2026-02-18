export function romanize(num) {
  if (isNaN(num)) return NaN
  var digits = String(+num).split(""),
    key = [
      "",
      "C",
      "CC",
      "CCC",
      "CD",
      "D",
      "DC",
      "DCC",
      "DCCC",
      "CM",
      "",
      "X",
      "XX",
      "XXX",
      "XL",
      "L",
      "LX",
      "LXX",
      "LXXX",
      "XC",
      "",
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
    ],
    roman = "",
    i = 3
  while (i--) roman = (key[+digits.pop() + i * 10] || "") + roman
  return Array(+digits.join("") + 1).join("M") + roman
}

export function dateToFractionalYear(dateInput, decimals = 6) {
  let date

  // 1. Handle Date objects
  if (dateInput instanceof Date) {
    date = dateInput
  }
  // 2. Handle Numbers (Unix Timestamps in ms)
  else if (typeof dateInput === "number") {
    date = new Date(dateInput)
  }
  // 3. Handle Strings
  else if (typeof dateInput === "string") {
    // Try to normalize separators (replace dots or slashes with dashes)
    const normalized = dateInput.replace(/[\.\/]/g, "-")

    // Pattern: YYYY-MM-DD (ISO)
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(normalized)) {
      date = new Date(normalized)
    }
    // Pattern: DD-MM-YYYY (European)
    else if (/^\d{1,2}-\d{1,2}-\d{4}/.test(normalized)) {
      const [d, m, y] = normalized.split("-").map(Number)
      date = new Date(y, m - 1, d)
    }
    // Fallback: Let the native parser try (for "Month Day, Year" etc.)
    else {
      date = new Date(dateInput)
    }
  }

  // Validation
  if (!date || isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${dateInput}`)
  }

  const year = date.getFullYear()
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)

  // Math: (Current - Start) / (Total ms in that specific year)
  const fraction = (date - start) / (end - start)
  const fractionalYear = year + fraction

  return Number(fractionalYear.toFixed(decimals))
}
