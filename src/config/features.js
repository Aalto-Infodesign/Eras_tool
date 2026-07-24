const isProd = process.env.NODE_ENV === "production"

// console.log(process.env.NODE_ENV)

export const features = {
  fileLoader: true,
  flowChart: true,
  clusters: true,
  // clusters: !isProd,
  // Main Dashboard
  dashboard: true,

  //Carousel
  carousel: true,
  debugPanel: !isProd,

  //Silhouettes Panel
  silhouettes: true,
  hasseDiagram: true,

  //ChartsContainer
  chartsContainer: true,
  sankey: true,
  matrix: !isProd,
  // Martini-glass intro: TrajectoriesChart layers reveal step by step while
  // clustering runs, synced with the ProgressiveLegend. `false` → full UI at once.
  progressiveStory: true,

  //SidePanel
  sidePanel: true,
}
