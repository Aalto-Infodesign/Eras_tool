import { useState, useEffect, useMemo } from "react"
// import useWindowSize from "./useWindowSize"

export function useMouseMove() {
  // 1. Each component gets its OWN 'position' state, initialized to {x: 0, y: 0}
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // const { width } = useWindowSize()

  // const bodyMargin = useMemo(() => {
  //   const marginLeft = document.querySelector("body").getBoundingClientRect().left
  //   return marginLeft
  // }, [width])

  useEffect(() => {
    const handleMouseMove = (event) => {
      console.log(event.clientX)
      setPosition({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return position
}

export function useMouseMoveSvg(svgRef) {
  const mousePosition = useMouseMove()
  const [svgCursorPosition, setSvgCursorPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!svgRef.current || !mousePosition.x || !mousePosition.y) return

    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = mousePosition.x
    pt.y = mousePosition.y

    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())

    console.log(svgP.x)
    setSvgCursorPosition({ x: svgP.x, y: svgP.y })
  }, [mousePosition])

  return svgCursorPosition
}
