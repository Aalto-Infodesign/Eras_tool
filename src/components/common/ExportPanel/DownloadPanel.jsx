import { motion } from "framer-motion"
import { useState } from "react"
import "./ExportPanel.css"
import { Download } from "lucide-react"
import { toPng, toSvg } from "html-to-image"
import { downloadImage } from "../../../utils/downloadImage"

export function DownloadPanel() {
  const [isHover, setIsHover] = useState(false)

  const buttonWrapperVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.1,
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.1,
        staggerDirection: -1, // opzionale: -1 per invertire l'ordine
      },
    },
  }
  const buttonVariants = {
    hidden: {
      opacity: 0,
      x: 10,
      pointerEvents: "none",
    },
    visible: {
      opacity: 1,
      x: 0,
      pointerEvents: "auto",
    },
  }

  function handleExport(format) {
    console.log("Exporting in format:", format)
    // Implement export logic here
    const svgID = "trajectoriesChartSvg"
    const svgElement = document.getElementById(svgID)
    if (!svgElement) {
      console.error("SVG element not found:", svgID)
      return
    }

    // Helper: download a blob
    function downloadBlob(blob, format) {
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.href = url
      const date = new Date().toISOString().slice(0, 10)
      link.download = `${date}_trajectories_chart.${format.toLowerCase()}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    function downloadPng(htmlElement, scale, filename) {
      const width = htmlElement.offsetWidth
      const height = htmlElement.offsetHeight

      toPng(htmlElement, {
        backgroundColor: "var(--surface-secondary)",
        width: width,
        height: height,
        pixelRatio: scale,
        style: {
          // width: width,
          // height: height,
          // transform: `scale(${scale})`,
          // transformOrigin: "top left",
        },
      }).then((data) => downloadImage(data, filename, "png"))
    }

    // function downloadSvg(htmlElement, filename) {
    //   toSvg(htmlElement, {
    //     // filter: () => {},
    //   }).then((data) => downloadImage(data, filename, "svg"))
    // }

    if (format === "png") {
      const scale = 4
      downloadPng(svgElement, scale, "trajectories")
      return
    }

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })

    downloadBlob(svgBlob, format)
    // downloadSvg(svgElement, "trajectories")
  }

  return (
    <motion.div
      className="export-panel"
      animate={isHover ? "visible" : "hidden"}
      initial="hidden"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <motion.div className="wrapper" variants={buttonWrapperVariants}>
        {/* Bottoni che appaiono all'hover */}
        <motion.button
          key={"PNG-btn"}
          className="active"
          variants={buttonVariants}
          whileHover={{ scale: 1.05 }}
          //   transition={{ duration: 0.2 }}
          onClick={() => handleExport("png")}
        >
          PNG
        </motion.button>

        <motion.button
          key={"SVG-btn"}
          className="active"
          variants={buttonVariants}
          whileHover={{ scale: 1.05 }}
          //   transition={{ duration: 0.2 }}
          onClick={() => handleExport("svg")}
        >
          SVG
        </motion.button>
      </motion.div>

      {/* Bottone principale sempre visibile */}
      <button>
        <Download size={12} />
      </button>
    </motion.div>
  )
}
