const HSL_REGEX =
  /hsl(a)?\(\s*([-\d.]+)(?:deg|g?rad|turn)?\s*(?:,\s*|(?:\s+))([\d.]+)%\s*(?:,\s*|(?:\s+))([\d.]+)%(?:(?:,\s*|(?:\s+\/\s*))([\d.]+))?\s*\)/i

// --- CORE LUMINANCE HELPERS ---

/**
 * Normalizes a hue value to the 0-360 range.
 * Handles negative values and values greater than 360.
 * @param {number} h Hue value (can be any number)
 * @returns {number} Normalized hue (0-360)
 */
function normalizeHue(h) {
  // Use modulo to wrap the value, then ensure it's positive
  h = h % 360
  return h < 0 ? h + 360 : h
}

/**
 * Converts HSL values to RGB values.
 * @param {number} h Hue (any number, will be normalized to 0-360)
 * @param {number} s Saturation (0-100)
 * @param {number} l Lightness (0-100)
 * @returns {number[]} Array of [r, g, b] (0-255)
 */
export function hslToRgb(h, s, l) {
  // Normalize hue to 0-360 range
  h = normalizeHue(h)

  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0
  if (h >= 0 && h < 60) {
    r = c
    g = x
    b = 0
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
    b = 0
  } else if (h >= 120 && h < 180) {
    r = 0
    g = c
    b = x
  } else if (h >= 180 && h < 240) {
    r = 0
    g = x
    b = c
  } else if (h >= 240 && h < 300) {
    r = x
    g = 0
    b = c
  } else if (h >= 300 && h < 360) {
    r = c
    g = 0
    b = x
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

/**
 * Calculates the Relative Luminance (perceived brightness) of an RGB color.
 * Formula from W3C for accessibility contrast calculation.
 * @param {number} r Red component (0-255)
 * @param {number} g Green component (0-255)
 * @param {number} b Blue component (0-255)
 * @returns {number} Luminance value between 0.0 (black) and 1.0 (white).
 */
function getLuminance(r, g, b) {
  const getNormalized = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const R = getNormalized(r)
  const G = getNormalized(g)
  const B = getNormalized(b)
  // Luminance formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
  // Green is weighted highest, followed by Red, then Blue (reflecting human sensitivity)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/**
 * Checks if the color is dark based on its calculated Luminance.
 *
 * @param {string} hslString - The HSL or HSLA color string.
 * @param {number} threshold - The luminance threshold (0.0 to 1.0). Default is 0.25.
 * @returns {{isDark: boolean, luminance: number} | null} Object with isDark status and luminance value, or null on error.
 */
export function isColorDark(hslString, threshold = 0.25) {
  try {
    const match = hslString.match(HSL_REGEX)
    if (!match) {
      console.error("Invalid HSL/HSLA format:", hslString)
      return null
    }
    // Components from the regex match
    const h = parseFloat(match[2])
    const s = parseFloat(match[3])
    const l = parseFloat(match[4])
    if (isNaN(h) || isNaN(s) || isNaN(l)) {
      console.error("One or more HSL components are invalid:", match[2], match[3], match[4])
      return null
    }
    // 1. Convert HSL to RGB (hue normalization happens inside hslToRgb)
    const [r, g, b] = hslToRgb(h, s, l)
    // 2. Calculate Luminance
    const luminance = getLuminance(r, g, b)
    // 3. Compare Luminance against threshold
    const isDark = luminance < threshold
    return { isDark, luminance }
  } catch (e) {
    console.error("Error processing HSL string:", e)
    return null
  }
}

function extractHSLValues(hslString) {
  try {
    const match = hslString.match(HSL_REGEX)
    if (!match) {
      console.error("Invalid HSL/HSLA format:", hslString)
      return null
    }
    // Components from the regex match
    const h = parseFloat(match[2])
    const s = parseFloat(match[3])
    const l = parseFloat(match[4])
    if (isNaN(h) || isNaN(s) || isNaN(l)) {
      console.error("One or more HSL components are invalid:", match[2], match[3], match[4])
      return null
    }
    // 1. Convert HSL to RGB (hue normalization happens inside hslToRgb)

    return [h, s, l]
  } catch (e) {
    console.error("Error processing HSL string:", e)
    return null
  }
}

export function HSLStringToRGBString(hslString) {
  const [h, s, l] = extractHSLValues(hslString)
  const [r, g, b] = hslToRgb(h, s, l)

  return `rgb(${r}, ${g}, ${b})`
}
