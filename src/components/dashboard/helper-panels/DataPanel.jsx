import { useDerivedData } from "../../../contexts/DerivedDataContext"
import { useData } from "../../../contexts/ProcessedDataContext"
import styles from "./DataPanel.module.css"

export function DataPanel({}) {
  const { silhouettes, trajectories } = useData()
  const {
    selectedIDs,
    filteredData,
    selectedSilhouettesData,
    filteredSilhouettes,
    filteredLinks,
    analytics,
  } = useDerivedData()

  const links = trajectories.flat()

  return (
    <div id="data-panel">
      <h4>Silhouettes</h4>
      <p>
        {selectedSilhouettesData.length > 0 && <span>{selectedSilhouettesData.length} / </span>}
        {filteredSilhouettes.length !== silhouettes.length && (
          <span>
            <b>{filteredSilhouettes.length}</b>
            {" of "}
          </span>
        )}
        {silhouettes.length}
      </p>
      <h4>Datapoints</h4>
      <p>
        {selectedIDs.length > 0 && <span>{selectedIDs.length} / </span>}
        {filteredData.length !== analytics.datapoints && (
          <span>
            <b>{filteredData.length} </b>
            {" of "}
          </span>
        )}
        {analytics.datapoints}
      </p>
      <h4>Segments</h4>
      <p>
        {filteredLinks.length !== links.length && (
          <span>
            <b>{filteredLinks.length} </b>
            {" of "}
          </span>
        )}
        {links.length}
      </p>
      <h4>Age Range</h4>
      <p>
        {Math.round(analytics.ageRange[0])} - {Math.round(analytics.ageRange[1])}
      </p>
      <h4>Date Range</h4>
      <p>
        {Math.round(analytics.dateRange[0])} - {Math.round(analytics.dateRange[1])}
      </p>
    </div>
  )
}
