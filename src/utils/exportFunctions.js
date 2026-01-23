/**
 * Function that requires an ARRAY of Ids
 * Creates a blob TSV and exports it
 */
export function downloadIDs(e, ids) {
  e.stopPropagation()

  // Create the text content
  const textContent = "FINNGENID\n" + ids.join("\n")

  // Create a blob with the text content
  const blob = new Blob([textContent], { type: "text/plain" })

  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob)

  // Create a temporary anchor element and trigger download
  const a = document.createElement("a")
  a.href = url
  a.download = `ids_${new Date().toISOString().split("T")[0]}.tsv` // adds date
  document.body.appendChild(a)
  a.click()

  // Clean up
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadIDsFromSilhouette(e, s) {
  e.stopPropagation()
  const ids = s.trajectories.map((d) => d[0].id)

  // Create the text content
  const textContent = "FINNGENID\n" + ids.join("\n")

  // Create a blob with the text content
  const blob = new Blob([textContent], { type: "text/plain" })

  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob)

  // Create a temporary anchor element and trigger download
  const a = document.createElement("a")
  a.href = url
  a.download = `ids_${new Date().toISOString().split("T")[0]}.txt` // adds date
  document.body.appendChild(a)
  a.click()

  // Clean up
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
