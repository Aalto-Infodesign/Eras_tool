import { useEffect, useMemo } from "react"
import { useFilters } from "../../contexts/FiltersContext"
import { useData } from "../../contexts/ProcessedDataContext"
import Button from "../common/Button/Button"
import { useClusteringWorker } from "../hooks/workerHooks/useClusteringWorker"
import { useDBSCANWorker } from "../hooks/workerHooks/useDBSCANWorker"
import styles from "./ClusteringView.module.css"
import { uniq } from "lodash"
import { scaleLinear, extent, scaleOrdinal, schemeCategory10 } from "d3"
import { useDerivedData } from "../../contexts/DerivedDataContext"
import { AnimatePresence, motion } from "framer-motion"

export function ClusteringView() {
  // const { selectedStep, stepIndex, totalSteps, advance, before, isDone } = useClusteringWorker()
  const { points, run } = useDBSCANWorker()

  const { silhouettes } = useDerivedData()
  const { IDsFromClustering } = useFilters()

  // TODO Also pass IDs so i know which point is which trajectories, so i can perform selection
  const pdaData = useMemo(
    () =>
      silhouettes
        .map((s) => ({
          id: s.name,
          value: s.trajectories.slice(0, 50).map((t) => t.map((tt) => tt.speed)),
          size: s.trajectories.flat().length,
        }))
        .sort((a, b) => b.size - a.size),
    [silhouettes],
  )

  useEffect(() => {
    run(pdaData)
  }, [pdaData])

  useEffect(() => {
    console.log(points)
  }, [points])

  const xScale = scaleLinear(extent(points.map((p) => p.x)), [10, 500 - 10])
  const yScale = scaleLinear(extent(points.map((p) => p.y)), [10, 500 - 10])
  const colorScale = scaleOrdinal(schemeCategory10)
  return (
    <p>
      <svg id="cluster" width={500} height={500} style={{ backgroundColor: "black" }}>
        <AnimatePresence>
          {points.map((p, i) => (
            <motion.circle
              key={p.index}
              initial={{
                cx: xScale(p.x),
                cy: yScale(p.y),
                fill: colorScale(p.cluster),
                r: 5,
              }}
              animate={{
                cx: xScale(p.x),
                cy: yScale(p.y),
                fill: colorScale(p.cluster),
              }}
              exit={{ r: 0 }}
            />
          ))}
        </AnimatePresence>
      </svg>
    </p>
  )

  // return (
  //   <div className={styles.clusteringView}>
  //     <div className="buttons-wrapper">
  //       <Button size="xs">Table</Button>
  //       <Button size="xs">Plot</Button>
  //     </div>

  //     <p>Steps {stepIndex + 1}</p>
  //     <p>Steps computed: {totalSteps}</p>
  //     {selectedStep && <p>Silhouettes: {selectedStep.length}</p>}
  //     <div className={styles.tableWrapper}>
  //       {selectedStep && (
  //         <table>
  //           <tbody>
  //             <tr>
  //               <th>Name</th>
  //               <th>Winner</th>
  //               <th>IDs</th>
  //               <th>Mean</th>
  //               <th>Bandwidth</th>
  //               <th>Assignments</th>
  //               <th>Stable</th>
  //             </tr>
  //             {selectedStep.map((l, i) => {
  //               if (!l.value) return null

  //               const silhouette = silhouettes.find((s) => s.name === l.value.id)
  //               const ids = silhouette.trajectories.map((t) => t[0].id)

  //               const winner = IDsFromClustering[i]

  //               return (
  //                 <tr key={"row" + l.value.id + i} style={{ opacity: l.value.stable ? 0.6 : 1 }}>
  //                   <td>{l.value.id}</td>
  //                   <td>{l.value.centers.length}</td>
  //                   <td>
  //                     <p key={"id-" + winner}>{winner}</p>
  //                   </td>

  //                   <td>{l.value.mean.toFixed(3)}</td>
  //                   <td>{l.value.bandwidth}</td>
  //                   <td>
  //                     {uniq(l.value.assignments).map((a) => (
  //                       <p>{a}</p>
  //                     ))}
  //                   </td>
  //                   <td>{l.value.stable ? "✓ stable" : "…"}</td>
  //                 </tr>
  //               )
  //             })}
  //           </tbody>
  //         </table>
  //       )}
  //     </div>

  //     <div className="buttons-wrapper">
  //       <Button size="small" onClick={before} disabled={stepIndex === 0} keystroke="ArrowLeft">
  //         {"→ Previous bandwidth step "}
  //       </Button>
  //       <Button
  //         size="small"
  //         onClick={advance}
  //         disabled={isDone && stepIndex === totalSteps - 1}
  //         keystroke="ArrowRight"
  //       >
  //         {isDone && stepIndex === totalSteps - 1 ? "Done" : "Next bandwidth step →"}
  //       </Button>
  //     </div>
  //   </div>
  // )
}
