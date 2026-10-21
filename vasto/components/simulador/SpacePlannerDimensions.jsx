import { topViewIsVertical } from "@/lib/space-plan-editing.mjs";
const format = (value) => `${Number(value.toFixed(2)).toLocaleString("pt-PT")} m`;

export default function SpacePlannerDimensions({ shelves, scale }) {
  const gaps = new Map();
  for (const shelf of shelves) {
    for (const axis of ["x", "y"]) {
      const cross = axis === "x" ? "y" : "x";
      const size = axis === "x" ? "w" : "h";
      const crossSize = axis === "x" ? "h" : "w";
      const end = shelf[axis] + shelf[size];
      const candidates = shelves.filter((other) => other !== shelf && other[axis] > end + 0.05 && Math.min(shelf[cross] + shelf[crossSize], other[cross] + other[crossSize]) - Math.max(shelf[cross], other[cross]) > 0.1);
      const next = candidates.sort((a, b) => a[axis] - b[axis])[0];
      if (!next) continue;
      const from = Math.max(shelf[cross], next[cross]);
      const to = Math.min(shelf[cross] + shelf[crossSize], next[cross] + next[crossSize]);
            // Keep a single label for each repeated aisle rather than one per module.
      const key = `${axis}-${end.toFixed(3)}-${next[axis].toFixed(3)}`;
      if (!gaps.has(key)) gaps.set(key, { axis, start: end, end: next[axis], from, to });
      else { const gap = gaps.get(key); gap.from = Math.min(gap.from, from); gap.to = Math.max(gap.to, to); }
    }
  }
  return <g pointerEvents="none" aria-label="Medidas das estantes e corredores">
    {(() => {
      const rows = new Map();
      shelves.forEach((shelf) => {
        const horizontal = !topViewIsVertical(shelf);
        const key = `${horizontal}-${(horizontal ? shelf.y : shelf.x).toFixed(3)}-${shelf.depth.toFixed(3)}`;
        if (!rows.has(key)) rows.set(key, { horizontal, shelves: [] });
        rows.get(key).shelves.push(shelf);
      });
      return [...rows.values()].flatMap(({ horizontal, shelves: row }, rowIndex) => {
        const axis = horizontal ? "x" : "y";
        const size = horizontal ? "w" : "h";
        const sorted = [...row].sort((a, b) => a[axis] - b[axis]);
        const runs = [];
        sorted.forEach((shelf) => {
          const last = runs[runs.length - 1];
          if (last && shelf[axis] <= last.end + 0.001) last.end = Math.max(last.end, shelf[axis] + shelf[size]);
          else runs.push({ start: shelf[axis], end: shelf[axis] + shelf[size], shelf });
        });
        return runs.map(({ start, end, shelf }, index) => {
          const depth = shelf.depth * scale;
          const x = horizontal ? (start + end) / 2 : shelf.x + shelf.w / 2;
          const y = horizontal ? shelf.y + shelf.h / 2 : (start + end) / 2;
          return <g key={`row-${rowIndex}-${index}`} transform={`translate(${x * scale},${y * scale})${horizontal ? "" : " rotate(-90)"}`}>
            <rect x="-25" y="-8" width="50" height="16" rx="6" fill="white" fillOpacity="0.9" />
            <text y="3" textAnchor="middle" fontSize={Math.max(6, Math.min(10, depth / 2.2))} fontWeight="600" fill="#424245" stroke="white" strokeWidth="2" paintOrder="stroke">{format(end - start)}</text>
          </g>;
        });
      });
    })()}
    {[...gaps.values()].map(({ axis, start, end, from, to }, index) => {
      const horizontal = axis === "x";
      const span = (end - start) * scale;
      const position = (from + to) / 2;
      if (span < 18) return null;
      return <g key={`gap-${index}`} transform={`translate(${(horizontal ? start : position) * scale},${(horizontal ? position : start) * scale})${horizontal ? "" : " rotate(90)"}`}>
        <path d={`M0 -4v8M0 0H${span}M${span} -4v8`} fill="none" stroke="#b3bcc5" strokeWidth="0.8" strokeDasharray="3 3" />
        <rect x={span / 2 - 23} y="-13" width="46" height="16" rx="6" fill="white" fillOpacity="0.95" />
        <text x={span / 2} y="-2" textAnchor="middle" fontSize="8" fontWeight="600" fill="#59656f" stroke="white" strokeWidth="3" paintOrder="stroke">{format(end - start)}</text>
      </g>;
    })}
  </g>;
}
