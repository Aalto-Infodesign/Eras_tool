export function downloadImage(dataUrl, filename, format) {
  const date = new Date().toISOString().slice(0, 10)
  const fullFileName = `${date}_${filename}.${format}`
  const a = document.createElement("a")

  a.setAttribute("download", fullFileName)
  a.setAttribute("href", dataUrl)
  a.click()
}
