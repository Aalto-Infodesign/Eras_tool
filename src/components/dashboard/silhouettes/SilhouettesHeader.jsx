import { isEqual } from "lodash"
import { motion } from "motion/react"

import Button from "../../common/Button/Button"
import { ShortcutSpan } from "../../common/ShortcutSpan/ShortcutSpan"
import { features } from "../../../config/features"
import { Slider } from "../../common/Slider/Slider"
import { FileDown } from "lucide-react"
import { downloadIDs } from "../../../utils/exportFunctions"
import { useIDsFromSilhouettes } from "./hooks/useSilhouetteInteractions"

export function SilhouettesHeader({
  isHasse,
  setIsHasse,
  posetData,
  orderMode,
  setOrderMode,
  existingIdealSilhouettes,
  existingIdealSilhouettesNames,
  selectedSilhouettesNames,
  setSelectedSilhouettesNames,
  percentRange,
  setPercentRange,
  silhouettesInPercentRange,
}) {
  const ids = useIDsFromSilhouettes(silhouettesInPercentRange)
  return (
    <motion.div layout>
      <h3>Silhouettes filters</h3>

      <div id="silhouettes-header">
        <div id="header-labels">
          <p>Mode</p>
          {existingIdealSilhouettes.length > 0 && <p>Order by</p>}
          <p>Quick select</p>
          <p>% Selector</p>
        </div>
        <div id="header-content">
          <div id="silhouettes-modes" className="buttons-wrapper">
            <Button
              size="xs"
              keystroke="l"
              onClick={() => setIsHasse(false)}
              data-selected={!isHasse}
              tooltip={"All the Silhouettes in a ordered list"}
              tooltipPosition="bottom-right"
            >
              <p>
                <ShortcutSpan>L</ShortcutSpan>ist
              </p>
            </Button>
            {features.hasseDiagram && (
              <Button
                size="xs"
                keystroke="t"
                onClick={() => setIsHasse(true)}
                data-selected={isHasse}
                disabled={!posetData}
                tooltip={"Tree map showing the relations and evolution of the Silhouettes"}
                tooltipPosition="bottom-right"
              >
                <p>
                  {!posetData ? (
                    <span>Loading...</span>
                  ) : (
                    <span>
                      <ShortcutSpan>T</ShortcutSpan>
                      ree
                    </span>
                  )}
                </p>
              </Button>
            )}
          </div>
          {/* <Switch toggleFunction={setIsHasse} labelOn="Hasse" labelOff="Trajectories" /> */}
          {existingIdealSilhouettes.length > 0 && (
            <div id="order-dropdown">
              <select value={orderMode} onChange={(e) => setOrderMode(e.target.value)}>
                <option value="size">Size</option>
                <option value="distance">Distance</option>
              </select>
            </div>
          )}

          <div id="selection-presets" className="buttons-wrapper">
            {existingIdealSilhouettes.length > 0 && (
              <Button
                size="xs"
                onClick={() => setSelectedSilhouettesNames(existingIdealSilhouettesNames)}
                data-selected={isEqual(selectedSilhouettesNames, existingIdealSilhouettesNames)}
                tooltip={
                  "Select all the Silhouettes matching the expectation flow (L. Distance of 1)"
                }
              >
                <p>
                  ★ <span>Matching Expectations</span>
                </p>
              </Button>
            )}
            <Button
              size="xs"
              onClick={() => setSelectedSilhouettesNames([])}
              data-selected={selectedSilhouettesNames.length === 0}
              tooltip={"Clear the Silhouette selection"}
            >
              <p>None</p>
            </Button>
          </div>

          <div className="buttons-wrapper" style={{ paddingTop: "var(--spacing-sm)" }}>
            {/* Custom export Slider */}
            <Slider
              min={0}
              max={100}
              value={percentRange}
              onChange={setPercentRange}
              width={200}
              height={6}
              cursorHeight={12}
              cursorWidth={3}
              hasRange
            />
            <Button
              size="small"
              tooltip={`Download all the IDs of the silhouettes in the % range (${ids.length} ids)`}
              tooltipPosition="bottom-left"
              onClick={(e) => downloadIDs(e, ids)}
              disabled={ids.length === 0}
            >
              <span>{ids.length}</span>
              <FileDown size={16} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
