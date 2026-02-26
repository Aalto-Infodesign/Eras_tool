/* eslint-disable no-restricted-globals */

import { getDominancePairsSelf } from "../../../../../utils/POHelperFunctions"
import { po } from "../../../../../utils/po"

self.onmessage = ({ data: { silhouettes } }) => {
  const result = computePoset(silhouettes)
  self.postMessage(result)
}

function computePoset(silhouettes) {
  console.log("POSET")
  if (!silhouettes || silhouettes.length === 0) {
    return null
  }

  const silhouetteNames = silhouettes.map((s) => s.name)
  const dominancePairs = getDominancePairsSelf(silhouetteNames)

  console.time("Poset Init")
  const { matrix, nodes } = po.domFromEdges(dominancePairs)
  const poset = po.createPoset(matrix, nodes)
  poset.setLayers()
  poset.setDepth()
  poset
    .enrich()
    .feature("parents", (name) => poset.getCovered(name).map((parent) => poset.features[parent]))
    .feature("children", (name) => poset.getCovering(name).map((child) => poset.features[child]))
    .feature("i", (name) => poset.elements.indexOf(name))
    .feature("statesArray", (name) => name.split("-"))
  console.timeEnd("Poset Init")

  const covers = poset.getCoverRelations()
  const leaves = poset.layers[poset.layers.length - 1] || []

  const poStructure = poset.exportStructure()

  return { posetStructure: poStructure, covers, leaves, silhouetteNames }
}
