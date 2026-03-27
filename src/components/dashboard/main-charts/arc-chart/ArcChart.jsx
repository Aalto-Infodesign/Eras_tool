import { useCharts } from "../ChartsContext"
import { Grid } from "../trajectories/Grid"

export const ArcChart = ({}) => {
  const { h } = useCharts()
  return (
    <div className="chart-container">
      <div id="trajectories-chart" className="svg-container">
        <svg preserveAspectRatio="xMidYMid meet" viewBox={`0 0 210 ${h}`}>
          <Grid />
        </svg>
      </div>
    </div>
  )
}
