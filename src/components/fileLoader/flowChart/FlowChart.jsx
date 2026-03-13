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
import { useViz } from "../../../contexts/VizContext"
import DownloadButton from "./flow-components/DownloadButton"

import { EdgeWithField } from "./flow-components/EdgeWithField"
import Button from "../../common/Button/Button"
import { ShortcutSpan } from "../../common/ShortcutSpan/ShortcutSpan"

const snapGrid = [25, 25]

export const FlowChart = () => {
  const { statesOrder, idealSilhouettes, setIdealSilhouettes } = useData()
  const { updatePosetColoring, palette, colorMode, setColorMode, isLegend } = useViz()
  const reactFlowWrapper = useRef(null)

  const edgeTypes = {
    edgeField: EdgeWithField,
  }

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onConnect = useCallback(
    (params) => {
      setNodes((currentNodes) => {
        const sourceNode = currentNodes.find((n) => n.id === params.source)
        const targetNode = currentNodes.find((n) => n.id === params.target)

        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: "edgeField",
              data: {
                source: {
                  value: sourceNode?.data.value,
                  index: sourceNode?.data.index,
                },
                target: {
                  value: targetNode?.data.value,
                  index: targetNode?.data.index,
                },
              },
            },
            eds,
          ),
        )
        return currentNodes // don't actually change nodes
      })
    },
    [setEdges, setNodes], // stable refs, never change
  )
  // TODO setIdealSilhouettes
  useEffect(() => {
    const allCombinations = getFullPathsFromFlow(nodes, edges)
    const silhouettesStrings = allCombinations.map((c) => c.join("-"))

    setIdealSilhouettes(silhouettesStrings)
  }, [nodes.length, edges])

  // Updating the sankey data state when Flow Chart is edited
  useEffect(() => {
    const dominanceArray = calculateDominanceArray(nodes, edges)
    console.log(dominanceArray)

    const nodesNames = nodes.map((node) => node.data.value)

    updatePosetColoring(dominanceArray, nodesNames)
    // updatePosetColoring(dominanceArray, statesData.statesNames)
  }, [edges, colorMode])

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          label: `${statesOrder.indexOf(node.data.value)} – ${node.data.value}`,
          index: node.data.index,
          color: palette[node.data.value],
        },
        style: { ...node.style, backgroundColor: `${palette[node.data.value]}` },
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

  return (
    <section className="flow-chart">
      <div style={{ display: !isLegend ? "contents" : "none" }}>
        <div className="buttons-wrapper">
          <p>Coloring mode</p>
          <Button
            size="xs"
            data-selected={colorMode === "standard"}
            onClick={() => setColorMode("standard")}
          >
            <ShortcutSpan keyCode="s">S</ShortcutSpan>tate
          </Button>
          <Button
            size="xs"
            data-selected={colorMode === "poset"}
            onClick={() => setColorMode("poset")}
            disabled={idealSilhouettes.length === 0}
          >
            Tran<ShortcutSpan keyCode="s">s</ShortcutSpan>ition
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
      </div>
    </section>
  )
}

function getFullPathsFromFlow(nodes, edges) {
  const allPaths = []

  // 1. Build ID-based adjacency list
  const adj = new Map()
  const hasIncoming = new Set()

  edges.forEach((edge) => {
    const { source, target } = edge // these are node IDs e.g. "node_1234_0.123"
    if (!adj.has(source)) adj.set(source, [])
    adj.get(source).push(target)
    hasIncoming.add(target)
  })

  // 2. Find root nodes (no incoming edges)
  const roots = nodes.map((n) => n.id).filter((id) => !hasIncoming.has(id))

  // 3. DFS traversal using node IDs, collect labels
  function traverse(nodeId, currentPath) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const newPath = [...currentPath, node.data.value] // or .label, whatever you need

    if (!adj.has(nodeId) || adj.get(nodeId).length === 0) {
      allPaths.push(newPath)
      return
    }

    adj.get(nodeId).forEach((nextId) => traverse(nextId, newPath))
  }

  roots.forEach((rootId) => traverse(rootId, []))
  return allPaths
}
