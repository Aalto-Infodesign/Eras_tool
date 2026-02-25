/* eslint-disable no-restricted-globals */

import { getDominancePairsSelf } from "../../../../../utils/POHelperFunctions"
import { po } from "../../../../../utils/po"

self.onmessage = ({ data: { silhouettes } }) => {
  const result = computePoset(silhouettes) // your heavy logic here
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

  // return {poset.exportStructure(), }

  const covers = poset.getCoverRelations()
  const leaves = poset.layers[poset.layers.length - 1] || []

  const poStructure = poset.exportStructure()
  // const newPO = po.createPoset(poStructure)

  // const array = [
  //   ["a", "b"],
  //   ["c", "a"],
  // ]

  // const { matrix, nodes } = po.domFromEdges(array)

  // console.log(matrix)
  // const testPO = po.createPoset(matrix, nodes)
  // const testStructure = testPO.exportStructure()

  // console.log("structure", testStructure)

  // const newPOtest = po.createPoset(testStructure).enrich().feature("x", "y")

  // console.log("New PO", newPOtest.features)

  // console.log("New PO", newPO.features)

  return { posetStructure: poStructure, covers, leaves, silhouetteNames }
  // return { poset: newPOtest }
}

// function exportValuesFromPO(poset) {
//   const covers = poset.getCoverRelations()
//   const leaves = poset.layers[poset.layers.length - 1] || []

//   const features = {}
//   for (const name of poset.elements) {
//     features[name] = { ...poset.features[name] }
//   }

//   const layers = poset.layers

//   console.log("FEATURES", features)

//   return { covers, leaves, features, layers }
// }
