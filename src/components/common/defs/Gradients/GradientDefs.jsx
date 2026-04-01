import { useMemo } from "react"
import { useDerivedData } from "../../../../contexts/DerivedDataContext"
import { useData } from "../../../../contexts/ProcessedDataContext"
import { useViz } from "../../../../contexts/VizContext"

export function GradientDefs() {
  const { statesOrder } = useData()
  const { palette } = useViz()
  const { lumps } = useDerivedData()

  const gradients = useMemo(() => {
    return lumps.map((l) => {
      // Determine gradient direction based on visual position
      const sourcePos = statesOrder.indexOf(l.source)
      const targetPos = statesOrder.indexOf(l.target)

      // If source is below target (higher index), gradient goes bottom to top
      // If source is above target (lower index), gradient goes top to bottom
      const y1 = sourcePos > targetPos ? "100%" : "0%"
      const y2 = sourcePos > targetPos ? "0%" : "100%"

      return {
        id: `gradient-${l.source}-${l.target}`,
        y1,
        y2,
        stops: [
          { offset: "0%", color: palette[l.source], opacity: 1 },
          { offset: "85%", color: palette[l.target], opacity: 1 },
        ],
      }
    })
  }, [lumps, palette, statesOrder])

  return (
    <defs>
      {gradients.map((grad) => (
        <linearGradient key={grad.id} id={grad.id} x1="0%" y1={grad.y1} x2="0%" y2={grad.y2}>
          {grad.stops.map((stop) => (
            <stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </linearGradient>
      ))}
    </defs>
  )
}
