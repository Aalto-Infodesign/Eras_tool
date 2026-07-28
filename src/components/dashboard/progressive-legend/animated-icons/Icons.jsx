import { motion, useReducedMotion } from "motion/react"

// Every icon is a 100x100 SVG built on the same grid of horizontal "state" rows,
// 15px apart. Motion values below come from Figma's `get_motion_context`; each
// icon notes its Figma node id and timeline length.
//
// Where Figma expresses motion as a transform (scaleX, translate y), we animate
// the equivalent SVG *attribute* instead — a CSS transform on an SVG child needs
// a bbox motion can't always resolve. `x`/`y` attributes go through `attrX`/`attrY`
// because plain `x`/`y` are transform keys.
const ACCENT = "#B794FF"
const ROW_YS = [19.5, 34.5, 49.5, 64.5, 79.5]

// The trajectory that threads the rows — identical in Figma across 647:329 and 714:2417.
const TRAJECTORY_PATH = "M19.5 20L32 34.5L37 49.5L47.5 64.5L72.5 80"

const DRAW_EASE = [0.5, 0, 0.5, 1]

// Static backdrop of state rows. `ys` is a parameter because the Segment icon
// keeps only its outer two rows.
function StateRows({ ys = ROW_YS, opacity = 1 }) {
  return (
    <g opacity={opacity}>
      {ys.map((y) => (
        <line key={y} x1="15" y1={y} x2="85" y2={y} stroke="white" strokeWidth="2" />
      ))}
    </g>
  )
}

// Drawn on the Figma 100x100 grid and scaled by `size` at the call site.
function IconSvg({ size = 100, children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      {children}
    </svg>
  )
}

// StatesIcon — Figma node 647:648, a 2s timeline played once.
// Each row draws in from the left over the same span, staggered by `drawDelay`;
// once all five are drawn, the two middle rows trade places (`shift`).
const STATE_ROWS = [
  { nodeId: "647:556", y: 19.5, drawDelay: 0 },
  { nodeId: "647:557", y: 34.5, drawDelay: 0.1142 },
  { nodeId: "647:558", y: 49.5, drawDelay: 0.2174, shift: 15 },
  { nodeId: "647:559", y: 64.5, drawDelay: 0.327, shift: -15 },
  { nodeId: "647:560", y: 79.5, drawDelay: 0.423 },
]

const DRAW_SPAN = 0.423
const SWAP = { delay: 0.911, duration: 0.347, ease: [0.799, 0, 0.232, 1] }

export function StatesIcon({ size }) {
  const reduceMotion = useReducedMotion()

  return (
    <IconSvg size={size}>
      {STATE_ROWS.map(({ nodeId, y, drawDelay, shift = 0 }) => (
        <motion.line
          key={nodeId}
          x1="15"
          stroke="white"
          strokeWidth="2"
          // The swap moves the endpoints rather than translating the line.
          // `initial={false}` snaps straight to the resting state — five full rows.
          initial={reduceMotion ? false : { x2: 15, y1: y, y2: y }}
          animate={{ x2: 85, y1: y + shift, y2: y + shift }}
          transition={{
            x2: { delay: drawDelay, duration: DRAW_SPAN, ease: "easeInOut" },
            y1: SWAP,
            y2: SWAP,
          }}
        />
      ))}
    </IconSvg>
  )
}

// TrajectoriesIcon — one trajectory drawn over the dimmed row grid.
export function TrajectoriesIcon({ size }) {
  const reduceMotion = useReducedMotion()

  return (
    <IconSvg size={size}>
      <StateRows opacity={0.5} />
      <motion.path
        d={TRAJECTORY_PATH}
        stroke={ACCENT}
        strokeWidth="2"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: [DRAW_EASE, "linear"], times: [0, 0.329, 1] }}
      />
    </IconSvg>
  )
}

// SilhouetteIcon — Figma node 714:2421, a 2s timeline played once. (Figma marks
// this cohort as looping; we deliberately play it once, like the other icons.)
// The parts share one 2s timeline, so these tracks keep Figma's keyframe +
// `times` form rather than being flattened to per-part delays.
//
// The lump's two limit paths bracket a translucent band; the two dotted
// trajectories (T2/T3) draw in after it.
const LUMP_BAND =
  "M20 34.42L16.5 20L54.89 19.5L63.5 34.42L58 49.5L62.5 64.5L72 80L37.5 80L27 64.5L21 49.5Z"
const LUMP_LOWER = "M16.5 20L20 34.42L21 49.5L27 64.5L37.5 80"
const LUMP_UPPER = "M54.89 19.5L63.5 34.42L58 49.5L62.5 64.5L72 80"
const T2_PATH = "M28.5 20L34.5 34.5L46 49.5L54 64.5L62.66 79.5"
const T3_PATH = "M23 20L27.5 35L41 50L58 64.5L68 79.5"

const SIL_TIMELINE = { duration: 2 }
const LUMP_REVEAL = {
  ...SIL_TIMELINE,
  times: [0, 0.3015, 1],
  ease: [[0.976, 0, 0.032, 1], "linear"],
}
// Trajectories thins from 2px accent to 1px white as the lump takes over.
const HANDOFF = {
  ...SIL_TIMELINE,
  times: [0, 0.0701, 0.1428, 1],
  ease: ["linear", DRAW_EASE, "linear"],
}

// A draw that holds, eases over one span of the shared timeline, then holds.
const silDraw = (start, end) => ({
  ...SIL_TIMELINE,
  times: [0, start, end, 1],
  ease: ["linear", DRAW_EASE, "linear"],
})

export function SilhouetteIcon({ size }) {
  const reduceMotion = useReducedMotion()

  return (
    <IconSvg size={size}>
      <StateRows opacity={0.5} />

      {/* Lump (714:2456) — Figma scales this from the centre, the one place a
          real transform is unavoidable. `fill-box` pins the origin to the
          group's own bbox rather than the whole 100x100 canvas. */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={reduceMotion ? false : { opacity: 0.1, scaleX: 0 }}
        animate={{ opacity: [0.1, 1, 1], scaleX: [0, 1, 1] }}
        transition={{ opacity: LUMP_REVEAL, scaleX: LUMP_REVEAL }}
      >
        <path d={LUMP_BAND} fill={ACCENT} opacity="0.5" />
        <path d={LUMP_LOWER} stroke={ACCENT} strokeWidth="2" />
        <path d={LUMP_UPPER} stroke={ACCENT} strokeWidth="2" />
      </motion.g>

      {/* Trajectories (714:2417) */}
      <motion.path
        d={TRAJECTORY_PATH}
        initial={reduceMotion ? false : { opacity: 1, strokeWidth: 2, stroke: ACCENT }}
        animate={{
          opacity: [1, 1, 0.8, 0.8],
          strokeWidth: [2, 2, 1, 1],
          stroke: [ACCENT, ACCENT, ACCENT, "#FFF"],
        }}
        transition={{
          opacity: HANDOFF,
          strokeWidth: HANDOFF,
          stroke: {
            ...SIL_TIMELINE,
            times: [0, 0.07, 0.0701, 0.1428],
            ease: ["linear", "linear", DRAW_EASE],
          },
        }}
      />

      {/* T2 (714:2482) and T3 (714:2491) */}
      {[
        { nodeId: "714:2482", d: T2_PATH, draw: silDraw(0.213, 0.347) },
        { nodeId: "714:2491", d: T3_PATH, draw: silDraw(0.259, 0.394) },
      ].map(({ nodeId, d, draw }) => (
        <motion.path
          key={nodeId}
          d={d}
          stroke="white"
          opacity="0.78"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: [0, 0, 1, 1] }}
          transition={{ pathLength: draw }}
        />
      ))}
    </IconSvg>
  )
}

// SegmentIcon — Figma node 647:646, a 2s timeline played once.
// A single trajectory between two states, then the guides and the "d" (duration)
// bracket that measure the gap. Only the outer two rows are kept, at 0.65.
const SEGMENT_ROW_YS = [14.5, 74.5]
const SEGMENT_PATH = "M19.5 15L72.5 75"

// Angle wedge between the trajectory and the lower row (647:333). Verbatim
// bezier from the Figma export, offset to its place on the canvas.
const WEDGE_OFFSET = "translate(48 56.94)"
const WEDGE_PATH =
  "M0 17.0594C2.81057e-07 13.8445 0.673989 10.6653 1.97848 7.72692C3.28297 4.78855 5.18898 2.1563 7.57353 0L23 17.0594L0 17.0594Z"

// Every guide draws over the same span; only the start time differs.
const GUIDE_SPAN = 0.312
const segGuide = (delay) => ({ delay, duration: GUIDE_SPAN, ease: DRAW_EASE })

const D_LABEL_Y = 93.5

export function SegmentIcon({ size }) {
  const reduceMotion = useReducedMotion()

  return (
    <IconSvg size={size}>
      <StateRows ys={SEGMENT_ROW_YS} opacity={0.65} />

      <path d={WEDGE_PATH} transform={WEDGE_OFFSET} fill={ACCENT} opacity="0.5" />

      {/* Trajectories (647:337) */}
      <motion.path
        d={SEGMENT_PATH}
        stroke={ACCENT}
        strokeWidth="2"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.608, ease: DRAW_EASE }}
      />

      {/* Vector 10 / 11 (647:338, 647:339) — the vertical guides */}
      {[
        { nodeId: "647:338", d: "M20 14L20 84", delay: 0.608 },
        { nodeId: "647:339", d: "M71 14L71 84", delay: 0.744 },
      ].map(({ nodeId, d, delay }) => (
        <motion.path
          key={nodeId}
          d={d}
          stroke="white"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={segGuide(delay)}
        />
      ))}

      {/* Vector 12 (647:340) — the bracket, drawn outwards from its centre
          (Figma pairs the dash length with a -0.5 dash offset). */}
      <motion.path
        d="M20 84L71 84"
        stroke="white"
        initial={reduceMotion ? false : { pathLength: 0, pathOffset: 0.5 }}
        animate={{ pathLength: 1, pathOffset: 0 }}
        transition={segGuide(0.92)}
      />

      {/* "d" (647:341) rises into place as the bracket lands */}
      <motion.text
        x="42"
        fontFamily='"Hack", monospace'
        fontSize="10"
        fill="white"
        initial={reduceMotion ? false : { opacity: 0, attrY: D_LABEL_Y + 20 }}
        animate={{
          opacity: 1,
          attrY: [D_LABEL_Y + 20, D_LABEL_Y + 20, D_LABEL_Y + 13.778, D_LABEL_Y + 0.047, D_LABEL_Y],
        }}
        transition={{
          opacity: { delay: 1.031, duration: 0.4, ease: [0.09, 0.55, 0.5, 1] },
          attrY: {
            duration: 2,
            times: [0, 0.5154, 0.7654, 0.9999, 1],
            ease: "linear",
          },
        }}
      >
        d
      </motion.text>
    </IconSvg>
  )
}

// BoxPlotIcon — Figma node 647:222, a 3.991s timeline played once.
// Whisker, then its two caps, then the box, then the range labels. Figma scales
// each part from its centre, so the endpoints animate outwards from the centre
// line instead. The box is a 10px-thick line rather than a rect: motion appends
// `px` to an animated `width`, which an SVG geometry attribute won't take.
const BOX_EASE = [0.923, 0, 0.14, 1]
const BOX_SPAN = 1.198
const BOX_MID_Y = 50
const LABEL_Y = 40

const boxGrow = (delay) => ({ delay, duration: BOX_SPAN, ease: BOX_EASE })
const labelRise = (delay) => ({ delay, duration: 0.234, ease: [0.671, 0, 0.259, 1] })

export function BoxPlotIcon({ size }) {
  const reduceMotion = useReducedMotion()

  return (
    <IconSvg size={size}>
      {/* Whisker (647:111) — grows out from the centre to both ends */}
      <motion.line
        y1={BOX_MID_Y}
        y2={BOX_MID_Y}
        stroke="white"
        strokeWidth="1"
        initial={reduceMotion ? false : { x1: 50, x2: 50 }}
        animate={{ x1: 16, x2: 84 }}
        transition={boxGrow(0)}
      />

      {/* Caps (647:113, 647:114) — grow out from the whisker */}
      {[
        { nodeId: "647:113", x: 16 },
        { nodeId: "647:114", x: 83 },
      ].map(({ nodeId, x }) => (
        <motion.line
          key={nodeId}
          x1={x}
          x2={x}
          stroke="white"
          strokeWidth="1"
          initial={reduceMotion ? false : { y1: BOX_MID_Y, y2: BOX_MID_Y }}
          animate={{ y1: BOX_MID_Y - 5, y2: BOX_MID_Y + 5 }}
          transition={boxGrow(1)}
        />
      ))}

      {/* Box (647:112) — a 45x10 bar centred on 49.5 */}
      <motion.line
        y1={BOX_MID_Y}
        y2={BOX_MID_Y}
        stroke={ACCENT}
        strokeWidth="10"
        initial={reduceMotion ? false : { x1: 49.5, x2: 49.5 }}
        animate={{ x1: 27, x2: 72 }}
        transition={boxGrow(1.598)}
      />

      {/* Range labels (647:127, 647:115) */}
      {[
        { nodeId: "647:127", x: 13, label: "8y", delay: 2.698 },
        { nodeId: "647:115", x: 78, label: "23y", delay: 2.828 },
      ].map(({ nodeId, x, label, delay }) => (
        <motion.text
          key={nodeId}
          x={x}
          fontFamily='"Hack", monospace'
          fontSize="7"
          fill="white"
          initial={reduceMotion ? false : { opacity: 0, attrY: LABEL_Y + 14 }}
          animate={{ opacity: 1, attrY: LABEL_Y }}
          transition={labelRise(delay)}
        >
          {label}
        </motion.text>
      ))}
    </IconSvg>
  )
}
