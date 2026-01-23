import { useState, useEffect } from "react"

/**
 * A custom React hook that detects if the current device is a touch device.
 * It's SSR-safe and only performs the check on the client side.
 *
 * @returns {boolean} - True if it's a touch device, otherwise false.
 */
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // This check ensures the code only runs on the client side.
    if (typeof window !== "undefined") {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0

      setIsTouchDevice(hasTouch)
    }
  }, []) // The empty dependency array ensures this effect runs only once on mount.

  return isTouchDevice
}
