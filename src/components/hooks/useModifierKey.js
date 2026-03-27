import { useState, useEffect, useCallback } from "react"

/**
 * Normalizes a key combo string into a consistent format for comparison.
 * e.g. "shift+K" → "shift+k", "meta+shift+z" stays "meta+shift+z"
 */
const normalizeCombo = (combo) =>
  combo
    .toLowerCase()
    .split("+")
    .map((k) => k.trim())
    .sort()
    .join("+")

/**
 * Builds a combo string from a live KeyboardEvent.
 * e.g. pressing Shift+K produces "shift+k"
 */
const comboFromEvent = (event) => {
  const parts = []
  if (event.metaKey) parts.push("meta")
  if (event.ctrlKey) parts.push("ctrl")
  if (event.altKey) parts.push("alt")
  if (event.shiftKey) parts.push("shift")

  const key = event.key.toLowerCase()
  // Avoid double-adding the modifier itself (e.g. pressing Shift alone)
  const isModifier = ["meta", "control", "ctrl", "alt", "shift"].includes(key)
  if (!isModifier) parts.push(key)

  return parts.sort().join("+")
}

/**
 * A custom hook to track if a key or key combo is being pressed.
 *
 * @param {string} targetKey - A single key ("Shift") or a combo ("shift+k", "meta+z", "ctrl+shift+t").
 *                             Case-insensitive. Modifier order doesn't matter.
 * @param {function} [onPress] - Optional callback fired when the key/combo is activated.
 * @returns {boolean} True if the key/combo is currently active.
 *
 * @example
 * const isSaving = useModifierKey("meta+s", () => save())
 * const isBold   = useModifierKey("ctrl+b")
 * const isShifted = useModifierKey("Shift")
 */
export const useModifierKey = (targetKey, onPress) => {
  const [isKeyPressed, setIsKeyPressed] = useState(false)

  const normalizedTarget = normalizeCombo(targetKey)
  const isCombo = normalizedTarget.includes("+")

  const handleKeyDown = useCallback(
    (event) => {
      const matched = isCombo ? comboFromEvent(event) === normalizedTarget : event.key === targetKey // preserve original casing for single keys

      if (matched) {
        onPress?.()
        setIsKeyPressed(true)
      }
    },
    [normalizedTarget, isCombo, targetKey, onPress],
  )

  const handleKeyUp = useCallback(
    (event) => {
      if (isCombo) {
        // Any key release breaks the combo
        setIsKeyPressed(false)
      } else {
        if (event.key === targetKey || !event.getModifierState(targetKey)) {
          setIsKeyPressed(false)
        }
      }
    },
    [normalizedTarget, isCombo, targetKey],
  )

  const handleWindowBlur = useCallback(() => {
    setIsKeyPressed(false)
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleWindowBlur) // 👈 window, not document
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [handleKeyDown, handleKeyUp, handleWindowBlur])

  return isKeyPressed
}
