import React, { useEffect, useState } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"

// SVG patterns to replace D3 textures
const PatternDefs = () => (
  <defs>
    {/* Lines pattern for "past" element */}
    <pattern id="patternLines" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0,0 l6,6" stroke="white" strokeWidth="0.3" strokeLinecap="square" />
    </pattern>

    {/* Circles pattern for "remote" element */}
    <pattern id="patternCircles" width="5.5" height="5.5" patternUnits="userSpaceOnUse">
      <circle cx="2.75" cy="2.75" r="0.6" fill="white" />
    </pattern>
  </defs>
)

const Dates = (props) => {
  const { date, sliderDimensions, cursorSize } = props
  const cursorWidth = 100
  const cursorHeight = 10
  const offset = 2.5

  // Motion value to track cursor position
  const x = useMotionValue(0)

  // Transform the x motion value to a date
  const selectedDate = useTransform(x, [0, cursorWidth], date.extent)

  // Derived states based on cursor position
  const selectedWidth = useTransform(x, (value) => cursorWidth - value)
  const remoteWidth = useTransform(x, (value) => value / 2 - 1)
  const pastX = useTransform(x, (value) => value / 2 + 1)
  const pastWidth = useTransform(x, (value) => value / 2 - 1)

  // Track if cursor is at minimum position
  const isAtMin = useTransform(x, (value) => value < 2)

  // Update parent component with selected date when x changes
  useEffect(() => {
    const unsubscribe = selectedDate.on("change", (date) => {
      setStartDate(date)
    })

    return unsubscribe
  }, [selectedDate])

  const handleDrag = (event, info) => {
    const newX = x.get() + info.delta.x
    console.log("dragging", newX)

    // Enforce constraints manually to ensure all derived values stay within bounds
    if (newX < 0) {
      x.set(0)
    } else if (newX > cursorWidth) {
      x.set(cursorWidth)
    } else {
      x.set(newX)
    }
  }
  // Display the selected date text
  const getSelectedDateText = () => {
    const currentDate = selectedDate.get()
    return x.get() >= 2 ? Math.floor(currentDate).toString() : ""
  }

  return (
    <div id="dates" data-state={date.active ? "active" : "inactive"}>
      <p>Dates:</p>
      <svg
        id="datesSvg"
        className="filter"
        width={sliderDimensions.x}
        height={sliderDimensions.y}
        style={{ cursor: "default" }}
      >
        <PatternDefs />

        {/* Remote element with circles pattern */}
        <motion.rect
          id="remote"
          y={offset}
          height={cursorHeight}
          width={remoteWidth}
          style={{ fill: "url(#patternCircles)", opacity: 0.5 }}
        />

        {/* Past element with lines pattern */}
        <motion.rect
          id="past"
          y={offset}
          height={cursorHeight}
          x={pastX}
          width={pastWidth}
          style={{ fill: "url(#patternLines)", opacity: 0.5 }}
        />

        {/* Selected range */}
        <motion.rect
          id="selected"
          y={offset}
          height={cursorHeight}
          x={x}
          width={selectedWidth}
          fill="white"
        />

        {/* Draggable cursor */}
        <motion.rect
          id="cursor"
          width={cursorSize.width}
          height={cursorHeight + offset * 2}
          //   x={x}
          fill="white"
          drag="x"
          dragDirectionLock
          onDrag={handleDrag}
          dragMomentum={false}
          dragConstraints={{ left: 0, right: cursorWidth }}
          dragElastic={0.1}
          //   opacity={0}
          style={{ cursor: "grab" }}
          whileTap={{ scale: 1.1 }}
          whileDrag={{ cursor: "grabbing", scale: 1.1 }}
        />
        {/* Draggable cursor */}
        {/* <motion.rect
          id="fake-cursor"
          width={cursorSize.width}
          height={cursorHeight + offset * 2}
          x={x}
          fill="white"
          style={{ pointerEvents: "none" }}
          //   drag="x"
          //   onDrag={handleDrag}
          //   dragMomentum={false}
          //   dragConstraints={{ left: 0, right: cursorWidth }}
          //   dragElastic={0}
          //   style={{ cursor: "grab" }}
          //   whileDrag={{ cursor: "grabbing" }}
        /> */}

        {/* Min marker */}
        <rect id="min" width="0.9" height={cursorHeight + offset * 2} x="0.1" fill="white" />

        {/* Min date text */}
        <motion.text
          id="firstDate"
          x="25"
          y={(cursorHeight + offset * 2) * 2}
          fill="white"
          textAnchor="end"
          style={{ opacity: useTransform(isAtMin, [true, false], [0.5, 0.2]) }}
        >
          {date.extent[0]}
        </motion.text>

        {/* Max date text */}
        <text x={cursorWidth} y={(cursorHeight + offset * 2) * 2} fill="white">
          {date.extent[1]}
        </text>

        {/* Selected date display */}
        <motion.text id="selectedDate" x={x} y="-5" fill="white" textAnchor="middle">
          {getSelectedDateText()}
        </motion.text>
      </svg>
    </div>
  )
}

export default Dates
