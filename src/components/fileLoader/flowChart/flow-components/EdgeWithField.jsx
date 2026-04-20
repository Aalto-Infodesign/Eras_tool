import { useState, useRef, useMemo } from "react"
import { EdgeToolbar, getBezierPath, BaseEdge, useReactFlow } from "@xyflow/react"
import Button from "../../../common/Button/Button"
import { ArrowDownToDot, ArrowUpFromDot } from "lucide-react"
import { useData } from "../../../../contexts/ProcessedDataContext"

import { motion } from "motion/react"
import { CloseButton } from "../../../common/Button/CloseButton"

// Simple example of an edge with a floating toolbar based on the connected nodes' positions
export function EdgeWithField(props) {
  const [edgePath, centerX, centerY] = getBezierPath(props)

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} />
      <EdgeToolbar edgeId={props.id} x={centerX} y={centerY} isVisible>
        <ThresholdPanel props={props} />
      </EdgeToolbar>
    </>
  )
}

function ThresholdPanel({ props }) {
  const { getNode } = useReactFlow()
  const [showInput, setShowInput] = useState(false)
  const { statesThresholds, addStateThreshold, removeStateThreshold } = useData()

  const inputRef = useRef(null)

  const handleAddClick = () => {
    if (inputRef.current) {
      const obj = {
        sourceState: sourceLabel,
        targetState: targetLabel,
        threshold: Number(inputRef.current.value),
      }
      if (showInput) addStateThreshold(obj)
    }
    setShowInput(!showInput)
  }

  const handleRemoveClick = () => {
    const obj = {
      sourceState: sourceLabel,
      targetState: targetLabel,
    }

    removeStateThreshold(obj)
    setShowInput(false)
  }

  //   const sourceLabel = "a"
  const sourceLabel = getNode(props.source).data.value
  const targetLabel = getNode(props.target).data.value
  // const y = Math.min(props.sourceY, props.targetY)

  const edgeThres = statesThresholds?.find(
    (item) => item.sourceState === sourceLabel && item.targetState === targetLabel,
  )

  const buttonLabel = useMemo(() => {
    if (!edgeThres && !showInput) return "set"
    if (!edgeThres && showInput) return "set"
    if (edgeThres && !showInput) return "edit"
    else return "edit"
  }, [edgeThres, showInput])

  const templateVariants = {
    hidden: {
      visibility: "hidden",
      opacity: 0,
      height: 0,
      transition: { duration: 0.15 },
    },
    visible: {
      visibility: "visible",
      opacity: 1,
      height: "auto",
      transition: { duration: 0.15 },
    },
  }

  return (
    <motion.div
      className="threshold-panel"
      layout
      initial="hidden"
      whileHover="visible"
      transition={{ duration: 0 }}
    >
      <motion.p variants={templateVariants} className="label">
        <span>
          <ArrowUpFromDot size={8} />
          {`${sourceLabel}`}
        </span>{" "}
        <span>
          <ArrowDownToDot size={8} />
          {`${targetLabel}`}
        </span>
      </motion.p>

      {showInput && (
        <motion.div className="input">
          <input type="number" ref={inputRef} />
          <span>years</span>
        </motion.div>
      )}
      {!showInput && <p className="value">{edgeThres?.threshold ?? 0}</p>}
      <motion.div variants={templateVariants}>
        <Button
          size="xs"
          onClick={handleAddClick}
          tooltip={"To prevent errors in the dataset, set a Threshold Value that by which..."}
        >
          {buttonLabel}
        </Button>
      </motion.div>
      <CloseButton isVisible={edgeThres?.threshold} onClick={handleRemoveClick} />
    </motion.div>
  )
}
