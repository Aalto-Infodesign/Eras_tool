import { useState, useRef, useEffect } from "react"

// The number of frames to sample for a more stable FPS calculation
const FPS_SAMPLE_RATE = 60

/**
 * Custom hook to calculate the current Frames Per Second (FPS).
 * It uses requestAnimationFrame to accurately track frame rendering time.
 * * @returns {number} The calculated framerate in FPS.
 */
const useFramerate = () => {
  const [fps, setFps] = useState(0)
  const frameTimes = useRef([])
  const lastTime = useRef(performance.now())
  const rafId = useRef(null)

  const calculateFps = (now) => {
    // Time elapsed since the last frame
    const elapsed = now - lastTime.current

    // Store the time taken for the current frame
    frameTimes.current.push(elapsed)

    // Keep only the last FPS_SAMPLE_RATE number of frame times
    if (frameTimes.current.length > FPS_SAMPLE_RATE) {
      frameTimes.current.shift()
    }

    // Calculate the average time per frame
    const totalTime = frameTimes.current.reduce((sum, time) => sum + time, 0)
    const averageTimeMs = totalTime / frameTimes.current.length

    // FPS is (1 second / average time in milliseconds) * 1000
    // We use Math.round() for a cleaner display
    const currentFps = Math.round((1000 / averageTimeMs) * 100) / 100

    setFps(currentFps)
    lastTime.current = now

    // Continue the animation loop
    rafId.current = requestAnimationFrame(calculateFps)
  }

  useEffect(() => {
    // Start the frame rate calculation loop
    rafId.current = requestAnimationFrame(calculateFps)

    // Cleanup function to stop the loop when the component unmounts
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, []) // Run only on mount and unmount

  return Math.floor(fps)
}

export default useFramerate
