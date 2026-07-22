import { useMemo } from "react"
import { isEmpty } from "lodash"
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position } from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { useData } from "../../../contexts/ProcessedDataContext"
import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useFilters } from "../../../contexts/FiltersContext"
import { useClustering } from "../../../contexts/ClusteringContext"
import { FilterSlider } from "../filters/UI/FilterSlider"
import Button from "../../common/Button/Button"

import styles from "./PipelineFlow.module.css"

/**
 * Prototype: the derived-data pipeline (RawData -> ... -> Clustering) as a
 * node graph instead of a mental model you have to trace through the context
 * files. Two node types:
 *  - "stage": read-only, just reports how many patients survive to that point.
 *  - "range"/"mode": a thin wrapper around the SAME controls the Filters panel
 *    already uses (FilterSlider, trajectoriesSelectionMode buttons) — editing
 *    here writes back to FiltersContext, it's a second view, not a second
 *    state.
 *
 * Standalone on purpose: its own ReactFlowProvider, not the app's global
 * FlowContext (that one is wired specifically to the file-import flowchart
 * feature and shouldn't be reused here). Drop <PipelineFlow /> anywhere
 * inside the FiltersProvider/DerivedDataProvider/ClusteringProvider tree.
 */

// Every visit is counted once per patient regardless of how many links they
// contribute, so stage counts are comparable across the patient/link unit
// change that happens partway through the real pipeline.
const distinctPatientCount = (links) => new Set(links.map((l) => l.id)).size

function StageNode({ data }) {
  return (
    <div className={styles.node}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeTitle}>{data.label}</div>
      <div className={styles.nodeCount}>{data.count.toLocaleString()} patients</div>
      {data.subtitle && <div className={styles.nodeSubtitle}>{data.subtitle}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function RangeFilterNode({ data }) {
  const { updateSelection, toggleInvertFilter } = useFilters()
  const { name, label, filter, count } = data
  if (!filter?.extent) return null

  const selection = [
    Math.max(filter.selection[0], filter.extent[0]),
    Math.min(filter.selection[1], filter.extent[1]),
  ]

  return (
    <div className={styles.node}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeTitle}>{label}</div>
      {/* nodrag: without it, dragging the slider handle drags the node instead */}
      <div className={`nodrag ${styles.nodeControl}`}>
        <FilterSlider
          min={filter.extent[0]}
          max={filter.extent[1]}
          value={selection}
          onChange={(value) => updateSelection(name, value)}
          width={180}
          hasRange
          mode="double"
          isInverted={filter.isInverted}
        />
      </div>
      <div className={`nodrag ${styles.nodeControl}`}>
        <Button
          size="xs"
          data-selected={filter.isInverted}
          onClick={() => toggleInvertFilter(name)}
        >
          Invert
        </Button>
      </div>
      <div className={styles.nodeCount}>{count.toLocaleString()} patients</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const TRAJECTORIES_MODES = [
  { value: "all", label: "All" },
  { value: "vertical", label: "‖ same-time" },
  { value: "diagonal", label: "╲ over-time" },
]

function ModeNode({ data }) {
  const { trajectoriesSelectionMode, setTrajectoriesSelectionMode } = useFilters()

  return (
    <div className={styles.node}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeTitle}>{data.label}</div>
      <div className={`nodrag ${styles.nodeControl} ${styles.modeButtons}`}>
        {TRAJECTORIES_MODES.map((m) => (
          <Button
            key={m.value}
            size="xs"
            data-selected={trajectoriesSelectionMode === m.value}
            onClick={() => setTrajectoriesSelectionMode(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </div>
      <div className={styles.nodeCount}>{data.count.toLocaleString()} patients</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { stage: StageNode, range: RangeFilterNode, mode: ModeNode }

const NODE_X_GAP = 260
const NODE_Y = 120

function PipelineFlowInner() {
  const { richData } = useData()
  const { data, filteredData, linksBySelectedSilhouettes, selectedLinks, filters } =
    useDerivedData()
  const { removedStates, selectedSilhouettesNames } = useFilters()
  const { scopedLinks, hasClusterSelection } = useClustering()

  const { nodes, edges } = useMemo(() => {
    // Date and disease-duration are applied together in one filter pass in
    // DerivedDataContext (not sequentially), so both nodes report the same
    // "after" count — there's no intermediate count between them to show.
    const stages = [
      {
        id: "source",
        type: "stage",
        label: "Original dataset",
        count: richData?.length ?? 0,
      },
      {
        id: "removedStates",
        type: "stage",
        label: "Removed states",
        count: data.length,
        subtitle: removedStates.length ? `${removedStates.length} state(s) excluded` : null,
      },
      {
        id: "date",
        type: "range",
        label: "Date range",
        name: "date",
        filter: filters.date,
        count: filteredData.length,
      },
      {
        id: "diseaseDuration",
        type: "range",
        label: "Disease duration",
        name: "diseaseDuration",
        filter: filters.diseaseDuration,
        count: filteredData.length,
      },
      {
        id: "silhouettes",
        type: "stage",
        label: "Silhouette selection",
        count: distinctPatientCount(linksBySelectedSilhouettes),
        subtitle: selectedSilhouettesNames.length
          ? `${selectedSilhouettesNames.length} selected`
          : "none selected (all shown)",
      },
      {
        id: "speed",
        type: "range",
        label: "Segment duration",
        name: "speed",
        filter: filters.speed,
        count: distinctPatientCount(selectedLinks),
      },
      {
        id: "mode",
        type: "mode",
        label: "Trajectory mode",
        count: distinctPatientCount(selectedLinks),
      },
      {
        id: "cluster",
        type: "stage",
        label: "Cluster selection",
        count: distinctPatientCount(scopedLinks),
        subtitle: hasClusterSelection ? "narrowed to selected cluster(s)" : "no cluster selected",
      },
    ]

    const nodes = stages.map((stage, i) => ({
      id: stage.id,
      type: stage.type,
      position: { x: i * NODE_X_GAP, y: NODE_Y },
      data: stage,
    }))

    const edges = stages.slice(1).map((stage, i) => ({
      id: `${stages[i].id}->${stage.id}`,
      source: stages[i].id,
      target: stage.id,
      animated: true,
    }))

    return { nodes, edges }
  }, [
    richData,
    data,
    filteredData,
    filters,
    linksBySelectedSilhouettes,
    selectedLinks,
    scopedLinks,
    hasClusterSelection,
    selectedSilhouettesNames,
    removedStates,
  ])

  if (isEmpty(filters)) return null

  return (
    <div className={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export function PipelineFlow() {
  return (
    <ReactFlowProvider>
      <PipelineFlowInner />
    </ReactFlowProvider>
  )
}
