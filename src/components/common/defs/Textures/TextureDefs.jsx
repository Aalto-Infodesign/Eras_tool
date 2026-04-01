// SVG patterns to replace D3 textures
export const TextureDefs = () => (
  <defs>
    {/* Lines pattern for "past" element */}
    <pattern id="mini-patternLines" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M0,0 l10,10" stroke="white" strokeWidth="1" strokeLinecap="square" />
      <path d="M5,0 l5,5" stroke="white" strokeWidth="1" strokeLinecap="square" />
      <path d="M0,5 l5,5" stroke="white" strokeWidth="1" strokeLinecap="square" />
    </pattern>

    {/* Circles pattern for "remote" element */}
    <pattern id="mini-patternCircles" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="white" />
    </pattern>
    {/* Lines pattern for "past" element */}
    <pattern id="patternLines" width="2" height="2" patternUnits="userSpaceOnUse">
      <path d="M0.5,0.5 l5.5,5.5" stroke="white" strokeWidth="0.3" strokeLinecap="square" />
    </pattern>

    {/* Circles pattern for "remote" element */}
    <pattern id="patternCircles" width="2" height="2" patternUnits="userSpaceOnUse">
      <circle cx="0.3" cy="1.25" r=".3" fill="white" />
    </pattern>
  </defs>
)
