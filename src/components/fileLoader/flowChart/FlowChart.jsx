import { useRef, useCallback, useMemo, useEffect } from "react"
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  useReactFlow,
  Background,
  useStoreApi,
  MiniMap,
} from "@xyflow/react"

import "@xyflow/react/dist/style.css"

import "./flowchart.css"

import { resolveCollisions } from "./resolveCollisions"

let id = 0
// const getId = () => `dndnode_${id++}`

const MIN_DISTANCE = 120
const snapGrid = [25, 25]

export const FlowChart = ({ setSankeyData = () => {} }) => {
  const store = useStoreApi()
  const reactFlowWrapper = useRef(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { screenToFlowPosition, getInternalNode } = useReactFlow()

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  // const data = useMemo(() => ({ nodes, links: edges }), [nodes, edges])

  useEffect(() => {
    setSankeyData({ nodes, links: edges })
  }, [nodes, edges])

  const getClosestEdge = useCallback((node) => {
    const { nodeLookup } = store.getState()
    const internalNode = getInternalNode(node.id)

    const closestNode = Array.from(nodeLookup.values()).reduce(
      (res, n) => {
        if (n.id !== internalNode.id) {
          const dx = n.internals.positionAbsolute.x - internalNode.internals.positionAbsolute.x
          const dy = n.internals.positionAbsolute.y - internalNode.internals.positionAbsolute.y
          const d = Math.sqrt(dx * dx + dy * dy)

          if (d < res.distance && d < MIN_DISTANCE) {
            res.distance = d
            res.node = n
          }
        }

        return res
      },
      {
        distance: Number.MAX_VALUE,
        node: null,
      },
    )

    if (!closestNode.node) {
      return null
    }

    const closeNodeIsSource =
      closestNode.node.internals.positionAbsolute.x < internalNode.internals.positionAbsolute.x

    return {
      id: closeNodeIsSource
        ? `${closestNode.node.id}-${node.id}`
        : `${node.id}-${closestNode.node.id}`,
      source: closeNodeIsSource ? closestNode.node.id : node.id,
      target: closeNodeIsSource ? node.id : closestNode.node.id,
    }
  }, [])

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  //   const onDrop = useCallback(
  //     (event) => {
  //       event.preventDefault()

  //       // check if the dropped element is valid
  //       if (!type) {
  //         return
  //       }
  //       if (!color) {
  //         return
  //       }

  //       console.log("Dropped type:", type)
  //       console.log("Dropped color:", color)

  //       // project was renamed to screenToFlowPosition
  //       // and you don't need to subtract the reactFlowBounds.left/top anymore
  //       // details: https://reactflow.dev/whats-new/2023-11-10
  //       const position = screenToFlowPosition({
  //         x: event.clientX,
  //         y: event.clientY,
  //       })
  //       const newNode = {
  //         id: getId(),
  //         type,
  //         position,
  //         className: "dnd-node",
  //         style: { backgroundColor: `${color}`, padding: 10, borderRadius: 5 },
  //         data: { label: `${label}`, value: 100, category: "Disease || Drug", color: color },
  //       }

  //       setNodes((nds) => nds.concat(newNode))
  //     },
  //     [screenToFlowPosition, type, label, color],
  //   )

  //   const onDragStart = (event, nodeType, color = "#000000") => {
  //     // setType(nodeType)
  //     // setColor(color)
  //     event.dataTransfer.setData("text/plain", nodeType)
  //     event.dataTransfer.setData("text/plain", color)
  //     event.dataTransfer.effectAllowed = "move"
  //   }

  const onNodeDragStop = useCallback(() => {
    setNodes((nds) =>
      resolveCollisions(nds, {
        maxIterations: Infinity,
        overlapThreshold: 0.5,
        margin: 10,
      }),
    )
  }, [setNodes])

  //   const onNodeDrag = useCallback(
  //     (_, node) => {
  //       const closeEdge = getClosestEdge(node)

  //       setEdges((es) => {
  //         const nextEdges = es.filter((e) => e.className !== "temp")

  //         if (
  //           closeEdge &&
  //           !nextEdges.find((ne) => ne.source === closeEdge.source && ne.target === closeEdge.target)
  //         ) {
  //           closeEdge.className = "temp"
  //           nextEdges.push(closeEdge)
  //         }

  //         return nextEdges
  //       })
  //     },
  //     [getClosestEdge, setEdges],
  //   )

  //   const onNodeDragStop = useCallback(
  //     (_, node) => {
  //       const closeEdge = getClosestEdge(node)

  //       setEdges((es) => {
  //         const nextEdges = es.filter((e) => e.className !== "temp")

  //         if (
  //           closeEdge &&
  //           !nextEdges.find((ne) => ne.source === closeEdge.source && ne.target === closeEdge.target)
  //         ) {
  //           nextEdges.push(closeEdge)
  //         }

  //         return nextEdges
  //       })
  //     },
  //     [getClosestEdge],
  //   )

  //   useEffect(() => {
  //     console.log("Nodes:", nodes)
  //     console.log("Edges:", edges)
  //   }, [nodes, edges])

  return (
    <div className="dndflow">
      <div className="flowchart-wrapper">
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            // onDragStart={onDragStart}
            // onDragOver={onDragOver}
            // onDrop={onDrop}
            // onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            fitView
            snapToGrid
            snapGrid={snapGrid}
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
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
