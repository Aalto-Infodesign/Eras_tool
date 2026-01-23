"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import "./Switch.css"

export default function Switch({ toggleFunction, labelOn = "Label On", labelOff = "Label Off" }) {
  const [isOn, setIsOn] = useState(false)

  const toggleSwitch = () => {
    setIsOn(!isOn)
    toggleFunction(!isOn)
  }

  return (
    <div className="switch-container">
      <motion.button
        className="toggle-button"
        style={{
          ...container,
          justifyContent: "flex-" + (isOn ? "start" : "end"),
        }}
        onClick={toggleSwitch}
      >
        <motion.div
          className="toggle-handle"
          style={handle}
          layout
          transition={{
            type: "spring",
            visualDuration: 0.2,
            bounce: 0.2,
          }}
        />
      </motion.button>
      <div className="toggle-label"> {isOn ? labelOn : labelOff} </div>
    </div>
  )
}

/**
 * ==============   Styles   ================
 */

const container = {
  width: 30,
  height: 20,
  backgroundColor: "var(--surface-contrast)",
  borderRadius: 10,
  cursor: "pointer",
  display: "flex",
  padding: 2,
  alignItems: "center",
}

const handle = {
  width: 15,
  height: 15,
  //   backgroundColor: "#9911ff",
  borderRadius: "50%",
}

const containerVariants = {
  on: { justifyContent: "flex-start", backgroundColor: "var(--surface-accent)" },
  off: { justifyContent: "flex-end", backgroundColor: "var(--surface-contrast)" },
}
