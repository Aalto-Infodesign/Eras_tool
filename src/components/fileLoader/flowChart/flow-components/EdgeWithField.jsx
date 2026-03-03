import { useState, useRef, useEffect } from "react"
import { EdgeToolbar, getBezierPath, BaseEdge, useReactFlow } from "@xyflow/react"
import Button from "../../../common/Button/Button"
import { ArrowDownToDot, ArrowUpFromDot } from "lucide-react"
import { useData } from "../../../../contexts/ProcessedDataContext"

// Simple example of an edge with a floating toolbar based on the connected nodes' positions
export function EdgeWithField(props) {
  const [edgePath, centerX, centerY] = getBezierPath(props)
  const { getNode } = useReactFlow()
  const [showInput, setShowInput] = useState(false)
  const { statesThresholds, addStateThreshold } = useData()

  const inputRef = useRef(null)

  // useEffect(() => console.log("ST", statesThresholds), [statesThresholds])

  const setThresholdBetweenStates = () => {
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

  //   const sourceLabel = "a"
  const sourceLabel = getNode(props.source).data.value
  const targetLabel = getNode(props.target).data.value
  // const y = Math.min(props.sourceY, props.targetY)

  // Derive it instead:
  const edgeThres = statesThresholds?.find(
    (item) => item.sourceState === sourceLabel && item.targetState === targetLabel,
  )

  const buttonLabel = !edgeThres ? "set" : "show"

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} />
      <EdgeToolbar
        edgeId={props.id}
        x={centerX}
        y={centerY}
        // onClick={setThresholdBetweenStates}
        isVisible
      >
        <div className="threshold-panel">
          <p>
            <span>
              <ArrowUpFromDot size={10} />
              {`${sourceLabel}`}
            </span>{" "}
            <span>
              <ArrowDownToDot size={10} />
              {`${targetLabel}`}
            </span>
          </p>

          {showInput && (
            <p>
              <input type="number" ref={inputRef} />
              <span>years</span>
            </p>
          )}
          {!showInput && edgeThres?.threshold && <p>{edgeThres.threshold} years</p>}
          <Button size="xs" onClick={setThresholdBetweenStates}>
            {buttonLabel}
          </Button>
        </div>
      </EdgeToolbar>
    </>
  )
}
