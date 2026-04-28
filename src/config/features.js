const isProd = process.env.NODE_ENV === "production"

// console.log(process.env.NODE_ENV)

export const features = {
  fileLoader: true,
  flowChart: true,
  clusters: !isProd,
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

  //SidePanel
  sidePanel: true,
}
