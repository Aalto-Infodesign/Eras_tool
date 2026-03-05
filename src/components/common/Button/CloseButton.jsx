import { motion } from "motion/react"
import { X } from "lucide-react"

export function CloseButton({ isVisible, onClick }) {
  const closeBtnVariants = {
    hidden: { scale: 0 },
    visible: { scale: 1, transition: { ease: "easeInOut" } },
  }

  return (
    <motion.button
      className="close-btn"
      variants={closeBtnVariants}
      initial={"hidden"}
      animate={isVisible ? "visible" : "hidden"}
      layout
      onClick={onClick}
    >
      <X size={16} />
    </motion.button>
  )
}
