import { useState, useRef } from "react"
import { EdgeToolbar, getBezierPath, BaseEdge, useReactFlow } from "@xyflow/react"
import Button from "../../../common/Button/Button"
import { ArrowDownToDot, ArrowUpFromDot } from "lucide-react"
import { useData } from "../../../../contexts/ProcessedDataContext"

// Simple example of an edge with a floating toolbar based on the connected nodes' positions
export function EdgeWithField(props) {
  const [edgePath, centerX, centerY] = getBezierPath(props)
  const { deleteElements, getEdges, getNode, nodes } = useReactFlow()
  const [showInput, setShowInput] = useState(false)
  const { statesThresholds, addStateThreshold } = useData()

  const inputRef = useRef(null)

  console.log(useReactFlow())

  const setThresholdBetweenStates = (n) => {
    console.log(`${n} months`)
    setShowInput(!showInput)

    if (inputRef.current) {
      const obj = {
        sourceState: sourceLabel,
        targetState: targetLabel,
        value: inputRef.current.value,
      }

      addStateThreshold(obj)

      console.log(obj)
    }
  }
  //   const deleteEdge = () => {
  //     const edge = getEdges().find((e) => e.id === props.id);
  //     if (edge) deleteElements({ edges: [edge] });
  //   };

  //   const sourceLabel = "a"
  const sourceLabel = getNode(props.source).data.value
  const targetLabel = getNode(props.target).data.value
  const y = Math.min(props.sourceY, props.targetY)

  // Derive it instead:
  const edgeThres = statesThresholds.find(
    (item) => item.sourceState === sourceLabel && item.targetState === targetLabel,
  )

  console.log(props)

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
              <span>days</span>
            </p>
          )}
          {!showInput && edgeThres?.value && <p>{edgeThres.value} years</p>}
          <Button size="xs" onClick={setThresholdBetweenStates}>
            {buttonLabel}
          </Button>
        </div>
      </EdgeToolbar>
    </>
  )
}
