import { topViewIsVertical } from "@/lib/space-plan-editing.mjs";
export function SpacePlannerDrawingDefs() {
  return <defs>
    <linearGradient id="space-metal" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f4f7f9" /><stop offset="0.4" stopColor="#b9c3cc" /><stop offset="0.7" stopColor="#e6ebef" /><stop offset="1" stopColor="#8695a2" /></linearGradient>
    <linearGradient id="space-upright" x1="0" x2="1"><stop offset="0" stopColor="#526472" /><stop offset="0.3" stopColor="#dce4ea" /><stop offset="0.6" stopColor="#aab8c2" /><stop offset="1" stopColor="#5f7485" /></linearGradient>
    <linearGradient id="space-blue" x1="0" x2="1"><stop offset="0" stopColor="#06498e" /><stop offset="0.4" stopColor="#2797ed" /><stop offset="1" stopColor="#07539b" /></linearGradient>
    <linearGradient id="space-orange" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffab60" /><stop offset="0.35" stopColor="#f47a2d" /><stop offset="1" stopColor="#ce4c12" /></linearGradient>
    <pattern id="space-wood" width="12" height="10" patternUnits="userSpaceOnUse"><rect width="12" height="10" fill="#d5b888" /><path d="M1 2h3m3 4h4M2 8h2M8 1h2" stroke="#ae8755" strokeWidth="0.6" opacity="0.6" /><path d="M4 4h2m4 5h2" stroke="#f0d6ae" strokeWidth="1" /></pattern>
    <pattern id="space-sheet" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e4e9ed" /><path d="M0 0v12M6 0v12" stroke="#bdc8d1" strokeWidth="0.65" /></pattern>
    <pattern id="space-floor-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0v20" fill="none" stroke="#e8edf1" strokeWidth="0.5" /></pattern>
  </defs>;
}

// Top projection: dimensions are the bay's footprint; no perspective distortion.
export default function SpacePlannerBay({ shelf, scale, type, material, index, selected, sharedStart = false }) {
  const vertical = topViewIsVertical(shelf);
  const length = (vertical ? shelf.h : shelf.w) * scale;
  const depth = (vertical ? shelf.w : shelf.h) * scale;
  const post = Math.max(0.8, Math.min(depth * 0.18, (type === "racks" ? 0.1 : 0.05) * scale));
  const startInset = sharedStart ? 0 : post;
  const beam = Math.max(0.8, Math.min(depth * 0.13, (type === "racks" ? 0.07 : 0.035) * scale));
  const wood = type === "picking" && material === "Aglomerado";
  const rack = type === "racks";
  const light = type === "ligeiras";
  const transform = vertical ? `translate(${(shelf.x + shelf.w) * scale} ${shelf.y * scale}) rotate(90)` : `translate(${shelf.x * scale} ${shelf.y * scale})`;
  return <g transform={transform} pointerEvents="none">
    <rect x="0.6" y="0.6" width={Math.max(0.1, length - 1.2)} height={Math.max(0.1, depth - 1.2)} fill={rack ? "#f8fafc" : "#e6e7e8"} stroke="#8d9da9" strokeWidth="0.6" />
    {rack ? null : <>
      <rect x={startInset} y={beam} width={Math.max(0.1, length - startInset - post)} height={Math.max(0.1, depth - beam * 2)} fill={wood ? "#dfc9a5" : "#e9ecef"} stroke={wood ? "#a38153" : "#a6b4bf"} strokeWidth="0.5" />

    </>}
    <rect x={startInset * 0.5} width={Math.max(0.1, length - (startInset + post) * 0.5)} height={beam} fill={rack ? "#ed9056" : light ? "#d9dcdf" : "#aeb8c0"} />
    <rect x={startInset * 0.5} y={depth - beam} width={Math.max(0.1, length - (startInset + post) * 0.5)} height={beam} fill={rack ? "#ed9056" : light ? "#d9dcdf" : "#aeb8c0"} />
    {(sharedStart ? [Math.max(0, length - post)] : [0, Math.max(0, length - post)]).map((x, i) => <g key={i}>
      <rect x={x} width={post} height={depth} fill={rack ? "#5686aa" : light ? "#d9dcdf" : "#9eabb5"} stroke={rack ? "#06498e" : light ? "#b8bbbe" : "#607887"} strokeWidth="0.4" />
      {[0, Math.max(0, depth - post)].map((y, j) => <rect key={j} x={x} y={y} width={post} height={post} fill={rack ? "#16639f" : light ? "#d9dbdd" : "#647b8b"} />)}
    </g>)}
    <rect x="0.4" y="0.4" width={Math.max(0.1, length - 0.8)} height={Math.max(0.1, depth - 0.8)} fill="none" stroke={selected ? "#ff5500" : "#99a7b2"} strokeWidth={selected ? 2.5 : 0.6}  />
  </g>;
}
