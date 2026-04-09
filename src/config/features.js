const isProd = process.env.NODE_ENV === "production"

// console.log(process.env.NODE_ENV)

export const features = {
  fileLoader: true,
  flowChart: true,
  // Main Dashboard
  dashboard: true,

  //Carousel
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
