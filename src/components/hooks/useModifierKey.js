import { useState, useEffect, useCallback } from "react"

/**
 * A custom hook to track if a modifier key is being pressed.
 * @param {string} targetKey The key to track (e.g., 'Meta', 'Control', 'Shift', 'Alt').
 * @returns {boolean} True if the key is currently pressed, false otherwise.
 */
export const useModifierKey = (targetKey) => {
  const [isKeyPressed, setIsKeyPressed] = useState(false)

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === targetKey) {
        setIsKeyPressed(true)
      }
    },
    [targetKey]
  )

  const handleKeyUp = useCallback(
    (event) => {
      if (event.key === targetKey) {
        setIsKeyPressed(false)
      }
    },
    [targetKey]
  )

  // 🐛 FIX: Add handler for window blur event 🐛
  const handleWindowBlur = useCallback(() => {
    // When the window loses focus (e.g., cmd+tab, alt+tab),
    // we assume all keys, especially modifiers, are released.
    setIsKeyPressed(false)
  }, [])

  useEffect(() => {
    // Add event listeners when the component mounts
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // 💡 Add blur listener
    window.addEventListener("blur", handleWindowBlur)

    // Clean up event listeners when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)

      // 💡 Remove blur listener
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [handleKeyDown, handleKeyUp, handleWindowBlur]) // Include handleWindowBlur in dependencies

  return isKeyPressed
}
