import { useRef, useEffect } from "react"
import { motion } from "motion/react"
import Button from "../common/Button/Button"
import { useViz } from "../../contexts/VizContext"

export function ProcessButton({ setIsOpen }) {
  const { setIsLegend } = useViz()
  const createVisualization = () => {
    setIsLegend(true)
    setIsOpen(false)
  }
  const buttonRef = useRef(null)

  useEffect(() => {
    setTimeout(() => {
      buttonRef.current && buttonRef.current.focus()
    }, 1000)
  }, [])

  const buttonVariants = {
    disabled: { opacity: 0.5, pointerEvents: "none" },
    active: { opacity: 1, pointerEvents: "auto", transition: { delay: 1 } },
  }

  return (
    <Button
      size="small"
      ref={buttonRef}
      variants={buttonVariants}
      initial={"disabled"}
      animate={"active"}
      className="process-button active"
      onClick={() => createVisualization()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          createVisualization()
        }
      }}
      whileTap={{ scale: 0.9, transition: { duration: 0.2 } }}
    >
      Create Visualization
    </Button>
  )
}
