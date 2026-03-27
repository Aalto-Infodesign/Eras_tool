import { useEffect } from "react"
import { select, hierarchy, tree } from "d3"
import { groupBy, mapValues, toArray, includes } from "lodash"

export function StatesDendrogram(props) {
  //   const { w, h, marginTop } = props
  const { silhouettes } = props
  const { palette } = props
  const { toggleSilhouetteFilter = () => {}, selectedSilhouettes = [] } = props

  // console.log(selectedSilhouettes)
  const w = 750
  const h = 800

  // TODO The "lumps" nodes are actually computated from the silhouette name, so they work for ACBCD but not for more complex names
  const dendroData = {
    name: "root",
    children: toArray(
      mapValues(groupBy(silhouettes, "name[0]"), (items, key) => ({
        name: key,
        children: items.map((i) => ({
          name: i.name,
          children: generateStringCombinations(i.name, 2).map((d) => ({ name: d })),
        })),
      }))
    ),
  }
  // console.log(dendroData)

  const clusterFunc = tree().size([h, w - 100])

  // Give the data to this cluster layout:
  const root = hierarchy(dendroData, function (d) {
    return d.children
  })
  // console.log(root)
  clusterFunc(root)

  useEffect(() => {
    const svgGroup = select("#dendrogram").attr("transform", "translate(40,0)") // bit of margin on the left = 40

    // Add the links between nodes:
    svgGroup
      .selectAll("path")
      .data(root.descendants().slice(1), (d) => `dendro-line-${d.data.name}`)
      .join("path")
      .attr("id", (d) => `dendro-line-${d.data.name}`)
      .attr("d", function (d) {
        return (
          "M" +
          d.y +
          "," +
          d.x +
          "C" +
          (d.parent.y + 50) +
          "," +
          d.x +
          " " +
          (d.parent.y + 150) +
          "," +
          d.parent.x + // 50 and 150 are coordinates of inflexion, play with it to change links shape
          " " +
          d.parent.y +
          "," +
          d.parent.x
        )
      })
      .style("fill", "none")
      .attr("stroke", "#ccc")

    // Add a circle for each node.
    svgGroup
      .selectAll(".dendro-node")
      .data(root.descendants(), (d) => `dendro-group-${d.data.name}`)
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .classed("dendro-node", true)
            .attr("transform", function (d) {
              //   console.log(d)
              return `translate(${d.y},${d.x})`
            })
            .attr("id", (d) => `dendro-group-${d.data.name}`)

          group
            .append("circle")
            .classed("selected", (d) => includes(selectedSilhouettes, d.data.name))

            .attr("r", 5)
            .style("fill", (d) => palette[d.data.name[0]])
            .attr("stroke", "black")
            .style("stroke-width", "1px")
          group
            .append("text")
            .text((d) => d.data.name)
            .attr("fill", "white")
        },
        (update) =>
          update
            .select("cirlce")
            .classed("selected", (d) => includes(selectedSilhouettes, d.data.name))
        // (exit) => exit.remove()
      )

    // console.log(document.getElementsByTagName("*").length)
  }, [root, selectedSilhouettes])

  return (
    <section id="statesDendrogram">
      <h1>Dendrogram</h1>
      <div className="chart-box">
        <svg id="statesDendrogramSvg" width={w} height={h}>
          <g id="dendrogram"></g>
        </svg>
      </div>
    </section>
  )
}

function splitStringByLength(str, chunkLength) {
  // Handle edge cases
  if (chunkLength <= 0) {
    throw new Error("Chunk length must be a positive number")
  }

  // Use array from with slice to create chunks
  return Array.from({ length: Math.ceil(str.length / chunkLength) }, (_, i) =>
    str.slice(i * chunkLength, (i + 1) * chunkLength)
  )
}

function generateStringCombinations(str, combinationLength) {
  // Handle edge cases
  if (combinationLength <= 0) {
    throw new Error("Combination length must be a positive number")
  }

  if (combinationLength > str.length) {
    return []
  }

  // Use a sliding window to generate all combinations
  const combinations = []
  for (let i = 0; i <= str.length - combinationLength; i++) {
    for (let j = i; j <= str.length - combinationLength; j++) {
      combinations.push(str.slice(j, j + combinationLength))
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(combinations)]
}
