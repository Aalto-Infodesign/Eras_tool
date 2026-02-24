import { Panel, useReactFlow, getNodesBounds, getViewportForBounds } from "@xyflow/react"
import { toPng } from "html-to-image"
import { Download } from "lucide-react"
import { downloadImage } from "../../../utils/downloadImage"

const imageWidth = 1024
const imageHeight = 1024

function DownloadButton() {
  const { getNodes } = useReactFlow()
  const onClick = () => {
    // we calculate a transform for the nodes so that all nodes are visible
    // we then overwrite the transform of the `.react-flow__viewport` element
    // with the style option of the html-to-image library
    const nodesBounds = getNodesBounds(getNodes())
    const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2)

    toPng(document.querySelector(".react-flow__viewport"), {
      backgroundColor: "var(--surface-secondary)",
      width: imageWidth,
      height: imageHeight,
      style: {
        width: imageWidth,
        height: imageHeight,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((data) => downloadImage(data, "flowchart", "png"))
  }

  return (
    <Panel position="top-right">
      <button className="download-btn xy-theme__button" onClick={onClick}>
        <Download size={16} /> .png
      </button>
    </Panel>
  )
}

export default DownloadButton
