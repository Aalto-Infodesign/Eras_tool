import { motion } from "framer-motion"
import { useState } from "react"
import "./ExportPanel.css"
import { Download } from "lucide-react"

export function ExportPanel() {
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

    // Export SVG -> PNG with inline styles + scaling
    async function exportSvgToPng(svgEl, scale = Math.max(1, window.devicePixelRatio || 2)) {
      // Clone svg to avoid mutating the DOM
      const cloned = svgEl.cloneNode(true)

      // Compute pixel size from bounding box
      const rect = svgEl.getBoundingClientRect()
      const widthPx = Math.max(1, Math.round(rect.width))
      const heightPx = Math.max(1, Math.round(rect.height))

      // Ensure proper namespace and explicit width/height
      cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg")
      cloned.setAttribute("width", String(widthPx))
      cloned.setAttribute("height", String(heightPx))

      // Inline all available stylesheet rules into the SVG to preserve styling
      let cssText = ""
      for (const sheet of document.styleSheets) {
        try {
          if (!sheet.cssRules) continue
          for (const rule of sheet.cssRules) {
            cssText += rule.cssText
          }
        } catch (e) {
          // ignore CORS-restricted stylesheets
        }
      }
      if (cssText) {
        const style = document.createElement("style")
        style.textContent = cssText
        // Insert first so it applies to the cloned svg subtree
        cloned.insertBefore(style, cloned.firstChild)
      }

      // Serialize
      const serializer = new XMLSerializer()
      let svgString = serializer.serializeToString(cloned)
      svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString

      // Convert to base64 data URL
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)))
      const imgSrc = "data:image/svg+xml;base64," + svgBase64

      // Create image and draw onto canvas
      const image = new Image()
      image.crossOrigin = "anonymous"
      return new Promise((resolve, reject) => {
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas")
            canvas.width = Math.round(widthPx * scale)
            canvas.height = Math.round(heightPx * scale)
            const ctx = canvas.getContext("2d")
            // scale so 1 SVG px -> scale canvas px
            ctx.setTransform(scale, 0, 0, scale, 0, 0)
            ctx.imageSmoothingEnabled = true
            ctx.drawImage(image, 0, 0)
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob)
                else reject(new Error("Canvas toBlob produced null"))
              },
              "image/png",
              1,
            )
          } catch (err) {
            reject(err)
          }
        }
        image.onerror = (e) => reject(new Error("Failed to load SVG image for export"))
        image.src = imgSrc
      })
    }

    if (format === "png") {
      const scale = 4
      exportSvgToPng(svgElement, scale)
        .then((blob) => downloadBlob(blob, "png"))
        .catch((err) => console.error("PNG export failed:", err))
      return
    }

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })

    downloadBlob(svgBlob, format)
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
