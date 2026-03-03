import { useRef, useCallback, useEffect } from "react"
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from "@xyflow/react"

import "@xyflow/react/dist/style.css"

import "./flowchart.css"

import { resolveCollisions } from "./resolveCollisions"

import { calculateDominanceArray } from "../../../utils/POHelperFunctions"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useRawData } from "../../../contexts/RawDataContext"
import { useViz } from "../../../contexts/VizContext"
import DownloadButton from "./flow-components/DownloadButton"

import { EdgeWithField } from "./flow-components/EdgeWithField"
import Button from "../../common/Button/Button"
import { ShortcutSpan } from "../../common/ShortcutSpan/ShortcutSpan"

const snapGrid = [25, 25]

export const FlowChart = ({ setSankeyData = () => {} }) => {
  const { rawData } = useRawData()
  const { scales } = useData()
  const { updatePosetColoring, palette, statesOrder, colorMode, setColorMode } = useViz()
  const reactFlowWrapper = useRef(null)

  const edgeTypes = {
    edgeField: EdgeWithField,
  }

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: `edgeField` }, eds)),
    [setEdges],
  )

  function resetFlowChartState() {
    setNodes([])
    setEdges([])
  }

  // Resetting Flowchart when new data is loaded
  useEffect(() => {
    console.log("Raw data changed, resetting Flow Chart state")
    resetFlowChartState()
  }, [rawData])

  // Updating the sankey data state when Flow Chart is edited
  useEffect(() => {
    setSankeyData({ nodes, links: edges })

    // console.log("Flow Chart Updated - Nodes:", nodes)
    // console.log("Flow Chart Updated - Edges:", edges)

    const dominanceArray = calculateDominanceArray(nodes, edges)
    console.log("Calculated Dominance Array:", dominanceArray)

    const nodesInexes = nodes.map((node) => node.data.index)

    updatePosetColoring(dominanceArray, nodesInexes)
    // updatePosetColoring(dominanceArray, statesData.statesNames)
  }, [edges, colorMode])

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          label: `${node.data.index} – ${scales.indexToName(node.data.index)}`,
          index: node.data.index,
          color: palette[node.data.index],
        },
        style: { ...node.style, backgroundColor: `${palette[node.data.index]}` },
      })),
    )
  }, [palette, setNodes, statesOrder])

  const onNodeDragStop = useCallback(() => {
    setNodes((nds) =>
      resolveCollisions(nds, {
        maxIterations: Infinity,
        overlapThreshold: 0.5,
        margin: 10,
      }),
    )
  }, [setNodes])

  // console.log("Rendering Flow Chart with nodes:", nodes, "and edges:", edges)

  return (
    <section className="flow-chart">
      <div className="buttons-wrapper">
        <p>Coloring mode:</p>
        <Button
          size="xs"
          data-selected={colorMode === "standard"}
          onClick={() => setColorMode("standard")}
        >
          <ShortcutSpan>S</ShortcutSpan>tate
        </Button>
        <Button
          size="xs"
          data-selected={colorMode === "poset"}
          onClick={() => setColorMode("poset")}
        >
          <ShortcutSpan>T</ShortcutSpan>ransition
        </Button>
      </div>
      <div className="dndflow">
        <div className="flowchart-wrapper">
          <div className="reactflow-wrapper" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              fitView
              snapToGrid
              snapGrid={snapGrid}
              edgeTypes={edgeTypes}
            >
              {nodes.length > 0 && (
                <MiniMap
                  nodeStrokeWidth={3}
                  pannable
                  zoomable
                  position="top"
                  bgColor="#00000000"
                  style={{ width: 100, height: 100 }}
                />
              )}
              <Controls />
              <Background />
              <DownloadButton />
            </ReactFlow>
          </div>
        </div>
      </div>
    </section>
  )
}
