import { useState, useEffect, useMemo } from "react"
import useWindowSize from "./useWindowSize"

export function useMouseMove() {
  // 1. Each component gets its OWN 'position' state, initialized to {x: 0, y: 0}
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const { width } = useWindowSize()

  const bodyMargin = useMemo(() => {
    const marginLeft = document.querySelector("body").getBoundingClientRect().left
    return marginLeft
  }, [width])

  useEffect(() => {
    // 2. Define the function that will update this component's state
    const handleMouseMove = (event) => {
      setPosition({ x: event.pageX - bodyMargin, y: event.pageY })
      // setPosition({ x: event.clientX, y: event.clientY })
      // console.log(`PageX: ${event.pageX}, PageX Corrected: ${event.pageX - bodyMargin} `)
    }

    // 3. Add an event listener when the component mounts
    window.addEventListener("mousemove", handleMouseMove)

    // 4. Return a cleanup function to remove the listener when the component unmounts
    // This is crucial to prevent memory leaks and errors.
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [bodyMargin]) // 5. The empty dependency array [] ensures this effect runs only once (on mount and unmount)

  return position
}
