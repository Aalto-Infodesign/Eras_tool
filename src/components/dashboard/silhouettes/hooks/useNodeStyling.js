// --- Custom Hook for Heavy Computations (Refactored) ---

/**
 * Calculates node styles and labels based on the hovered node.
 * This is derived state, so useMemo is preferred over useEffect+useState.
 */

import { useMemo } from "react"
export const useNodeStyling = (poset, hoveredNode) => {
  return useMemo(() => {
    const styles = {}
    const labels = {}
    if (!poset) return { styles, labels }

    if (hoveredNode) {
      // 1. Default dimmed state
      poset.elements.forEach((name) => {
        styles[name] = { opacity: 0.3, scale: 0.8 }
      })

      // 2. Recursive helper
      const styleRelatives = (node, relationship, level, visited) => {
        if (!node || visited.has(node.name)) return
        visited.add(node.name)

        styles[node.name] = {
          opacity: 1, // Keep relatives visible
          scale: Math.max(0.6, 1 - level * 0.1),
        }
        labels[node.name] = `${relationship} ${level}`

        const nextNodes = relationship === "Parent" ? node.parents : node.children
        nextNodes?.forEach((nextNode) => styleRelatives(nextNode, relationship, level + 1, visited))
      }

      // 3. Highlight hovered and relatives
      styles[hoveredNode.name] = { opacity: 1, scale: 1 }
      const visited = new Set([hoveredNode.name])
      hoveredNode.parents?.forEach((p) => styleRelatives(p, "Parent", 1, visited))
      hoveredNode.children?.forEach((c) => styleRelatives(c, "Child", 1, visited))

      // 4. Highlight siblings (from magnification logic)
      const parentName = poset.getCovered(hoveredNode.name)[0]
      const parent = poset.features[parentName]
      if (parent) {
        const siblings = parent.children
        const siblingNames = siblings.map((d) => d.name)
        siblingNames.forEach((name) => {
          // Only override if not the hovered node itself
          if (name !== hoveredNode.name) {
            styles[name] = { opacity: 1, scale: 1 }
          }
        })
      }
    } else {
      // 5. Reset all if no hover
      poset.elements.forEach((name) => {
        styles[name] = { opacity: 1, scale: 1 }
      })
    }

    return { styles, labels }
  }, [poset, hoveredNode])
}
