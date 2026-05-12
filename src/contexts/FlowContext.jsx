// FlowContext.jsx

import { createContext, useContext, useCallback, useRef } from "react"
import { useNodesState, useEdgesState, addEdge } from "@xyflow/react"

const FlowContext = createContext(null)

export function FlowProvider({ children, initialNodes = [], initialEdges = [] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const initialized = useRef(false) // ← key addition

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
  return (
    <FlowContext.Provider
      value={{
        nodes,
        edges,
        setNodes,
        setEdges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        initialized,
      }}
    >
      {children}
    </FlowContext.Provider>
  )
}

export const useFlowContext = () => {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error("useFlowContext must be used inside <FlowProvider>")
  return ctx
}
