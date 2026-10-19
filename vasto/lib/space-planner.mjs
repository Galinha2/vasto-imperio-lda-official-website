import { spaceModelCost, estimateSpacePlan } from "./space-catalog.mjs";
const overlaps = (a, b) => a.x < b.x + b.w - 1e-7 && a.x + a.w > b.x + 1e-7 && a.y < b.y + b.h - 1e-7 && a.y + a.h > b.y + 1e-7;
export { overlaps };

export function doorClearance(width, length, wall, offset, doorWidth, aisle) {
  const horizontal = ["top", "bottom"].includes(wall);
  const span = horizontal ? width : length;
  const passage = Math.min(span, Math.max(aisle, doorWidth + 0.2));
  const start = Math.max(0, Math.min(span - passage, offset - (passage - doorWidth) / 2));
  const distance = Math.min(1.5, horizontal ? length : width);
  if (horizontal) return { x: start, y: wall === "top" ? 0 : length - distance, w: passage, h: distance };
  return { x: wall === "left" ? 0 : width - distance, y: start, w: distance, h: passage };
}

export function planSpace(config, models) {
  const { width, length, height, depth, aisle, doorWall, doorOffset, doorWidth, center } = config;
  if (![width, length, height, depth, aisle, doorOffset, doorWidth].every(Number.isFinite) || width < 1 || length < 1 || width > 30 || length > 30 || height < 1 || height > 12 || depth <= 0 || aisle < 0.8 || aisle > 5 || doorWidth < 0.5 || doorOffset < 0 || !["top", "bottom", "left", "right"].includes(doorWall)) return { error: "Verifique as medidas: sala de 1 a 30 m, altura de 1 a 12 m e corredor de 0,80 a 5 m.", plans: [] };
  const wallSize = ["top", "bottom"].includes(doorWall) ? width : length;
  if (doorOffset + doorWidth > wallSize + 1e-7) return { error: "A porta não cabe nessa posição. Ajuste a distância ao canto ou a largura da porta.", plans: [] };
  const available = models.filter((m) => Math.abs(m.depth - depth) < 0.001 && m.height <= height - 0.2 && (!config.sameModuleLength || Math.abs(m.nominalWidth - config.moduleLength) < 0.001));
  if (!available.length) return { error: "Não existe uma estante desta profundidade com pelo menos 20 cm de folga até ao teto. Experimente outra profundidade ou altura.", plans: [] };
  const shelfHeight = Math.max(...available.map((m) => m.height));
  const widths = [...new Set(available.filter((m) => m.height === shelfHeight).map((m) => m.width))].sort((a, b) => b - a);
  const levels = Number.isInteger(config.levels) && config.levels > 0 ? config.levels : 4;
  const costs = new Map(widths.map((width) => [width, Math.min(...available.filter((m) => m.height === shelfHeight && m.width === width).map((m) => spaceModelCost(m, levels) - Math.round(m.fixedParts[0].price * 100)))]));
  const packing = config.optimization === "economico" ? costs : null;
  if (config.parallelOnly && config.rowLayout === "manual") return fixedParallelRows(config, widths, shelfHeight, packing);
  const plans = [];
  for (const rotated of [false, true]) {
    const W = rotated ? length : width, H = rotated ? width : length;
    const wall = rotated ? { top: "left", bottom: "right", left: "top", right: "bottom" }[doorWall] : doorWall;
    // Preserve the cross-aisle and reserve only the first 1.5 metres at the door.
    const reserved = [
      { x: 0, y: Math.max(0, (H - aisle) / 2), w: W, h: Math.min(H, aisle) },
      doorClearance(W, H, wall, doorOffset, doorWidth, aisle),
    ];
    const rows = W >= depth + aisle ? [{ x: 0, wall: "left", central: false }] : [];
    if (W >= depth * 2 + aisle) rows.push({ x: W - depth, wall: "right", central: false });
    if (config.parallelOnly) {
      rows.length = 0;
      for (let x = 0; x + depth <= W + 1e-7; x += depth + aisle) {
        const atRightWall = Math.abs(x + depth - W) < 1e-7;
        if (!center && x > 1e-7 && !atRightWall) continue;
        rows.push({ x, wall: x < 1e-7 ? "left" : atRightWall ? "right" : "center", central: x > 1e-7 && !atRightWall });
      }
      if (!center && W >= 2 * depth + aisle && !rows.some((row) => row.wall === "right")) rows.push({ x: W - depth, wall: "right", central: false });
    }
    if (!config.parallelOnly && center && rows.length === 2) {
      for (let x = depth + aisle; x + depth * 2 + aisle <= W - depth + 1e-7; x += depth * 2 + aisle) {
        rows.push({ x, central: true }, { x: x + depth, central: true });
      }
    }
    const shelves = [];
    for (const row of rows) {
      const cuts = reserved.filter((r) => row.x < r.x + r.w - 1e-7 && row.x + depth > r.x + 1e-7).map((r) => [Math.max(aisle / 2, r.y), Math.min(H - aisle / 2, r.y + r.h)]).sort((a, b) => a[0] - b[0]);
      let cursor = aisle / 2;
      const segments = [];
      for (const [from, to] of cuts) { if (from > cursor) segments.push([cursor, from]); cursor = Math.max(cursor, to); }
      if (cursor < H - aisle / 2) segments.push([cursor, H - aisle / 2]);
      for (const [from, to] of segments) {
        let y = from;
        for (const size of packRun(to - from, widths, packing)) {
          const rect = { x: row.x, y, w: depth, h: size, runWidth: size, depth, central: row.central, wall: row.wall || "center", height: shelfHeight };
          if (!reserved.some((r) => overlaps(rect, r))) shelves.push(rect);
          y += size;
        }
      }
    }
    const transpose = (r) => rotated ? { ...r, x: r.y, y: r.x, w: r.h, h: r.w, ...(r.wall && { wall: { left: "top", right: "bottom", top: "left", bottom: "right", center: "center" }[r.wall] }) } : r;
    plans.push({ id: `${rotated ? "horizontal" : "vertical"}-${center}`, label: rotated ? "Filas na horizontal" : "Filas na vertical", shelves: shelves.map(transpose), reserved: reserved.map(transpose), height: shelfHeight, area: shelves.reduce((sum, s) => sum + s.w * s.h, 0), runLength: shelves.reduce((sum, s) => sum + s.h, 0), centralCount: shelves.filter((s) => s.central).length });
  }
  if (!config.parallelOnly) {
  for (const reverse of [false, true]) plans.push(perimeterPlan(config, widths, shelfHeight, reverse, null, packing));
  const permutations = (items) => items.length ? items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map((rest) => [item, ...rest])) : [[]];
  for (const order of permutations(["top", "bottom", "left", "right"])) {
    for (const alignEnd of [false, true]) plans.push(perimeterPlan(config, widths, shelfHeight, false, { order, alignEnd }, packing));
  }
  }
  if (packing) {
    const baseline = planSpace({ ...config, optimization: "capacidade" }, models).plans;
    plans.push(...baseline);
    const maxLength = Math.max(...plans.map((p) => p.runLength));
    const economical = plans.filter((p) => p.runLength + 1e-7 >= maxLength * 0.95);
    for (const plan of economical) plan.estimate = estimateSpacePlan(plan, models, levels, config.material || "Aglomerado");
    return { plans: economical.sort((a, b) => (a.estimate?.subtotal ?? Infinity) - (b.estimate?.subtotal ?? Infinity) || b.runLength - a.runLength), error: "" };
  }
  return { plans: plans.sort((a, b) => b.runLength - a.runLength), error: "" };
}


export function packRun(length, widths, costs = null) {
  const capacity = Math.max(0, Math.floor(length * 100 + 1e-6));
  const dp = Array(capacity + 1).fill(null); dp[0] = { widths: [], cost: 0 };
  for (let n = 1; n <= capacity; n++) for (const width of widths) {
    const size = Math.ceil(width * 100 - 1e-6);
    if (size <= n && dp[n - size] !== null) {
      const previous = dp[n - size];
      const next = { widths: [...previous.widths, width], cost: previous.cost + (costs?.get(width) || 0) };
      if (dp[n] === null || (costs ? next.cost < dp[n].cost || (next.cost === dp[n].cost && next.widths.length < dp[n].widths.length) : next.widths.length < dp[n].widths.length)) dp[n] = next;
    }
  }
  let best = capacity; while (best && dp[best] === null) best--;
  if (costs) for (let n = Math.ceil(best * 0.95); n <= capacity; n++) {
    if (dp[n] && (dp[n].cost < dp[best].cost || (dp[n].cost === dp[best].cost && n > best))) best = n;
  }
  return dp[best]?.widths || [];
}

function perimeterPlan(config, widths, height, reverse, compact = null, packing = null) {
  const { width: W, length: H, depth: d, aisle, doorWall, doorOffset, doorWidth, center } = config;
  const reserved = [doorClearance(W, H, doorWall, doorOffset, doorWidth, aisle)];
  const shelves = [], fronts = [];
  const rows = [
    { wall: "top", from: compact ? 0 : d, to: compact ? W : W - d, horizontal: true },
    { wall: "bottom", from: compact ? 0 : d, to: compact ? W : W - d, horizontal: true },
    { wall: "left", from: compact ? 0 : d, to: compact ? H : H - d, horizontal: false },
    { wall: "right", from: compact ? 0 : d, to: compact ? H : H - d, horizontal: false },
  ];
  if (reverse) rows.reverse();
  if (compact) rows.sort((a, b) => compact.order.indexOf(a.wall) - compact.order.indexOf(b.wall));
  function addRow(row) {
    const make = (position, size) => {
      const x = row.horizontal ? position : row.wall === "left" ? 0 : row.wall === "right" ? W - d : row.x;
      const y = row.horizontal ? row.wall === "top" ? 0 : H - d : position;
      const shelf = { x, y, w: row.horizontal ? size : d, h: row.horizontal ? d : size, height, depth: d, runWidth: size, central: !!row.central, wall: row.wall || "center" };
      const front = row.horizontal
        ? { x, y: row.wall === "top" ? y + d : y - aisle, w: size, h: aisle }
        : { x: row.wall === "left" || row.facing === "right" ? x + d : x - aisle, y, w: aisle, h: size };
      return { shelf, front };
    };
    const needsFront = !compact || row.central;
    const valid = ({ shelf, front }) => shelf.x >= -1e-7 && shelf.y >= -1e-7 && shelf.x + shelf.w <= W + 1e-7 && shelf.y + shelf.h <= H + 1e-7 && (!needsFront || (front.x >= -1e-7 && front.y >= -1e-7 && front.x + front.w <= W + 1e-7 && front.y + front.h <= H + 1e-7)) && !reserved.some((r) => overlaps(shelf, r)) && !shelves.some((s) => overlaps(shelf, s) || (needsFront && overlaps(front, s))) && !fronts.some((f) => overlaps(shelf, f));
    const sample = make(0, 0.01);
    const cuts = [];
    const project = (rect, section) => {
      const crossOverlap = row.horizontal
        ? rect.y < section.y + section.h - 1e-7 && rect.y + rect.h > section.y + 1e-7
        : rect.x < section.x + section.w - 1e-7 && rect.x + rect.w > section.x + 1e-7;
      if (crossOverlap) cuts.push(row.horizontal ? [rect.x, rect.x + rect.w] : [rect.y, rect.y + rect.h]);
    };
    for (const rect of [...reserved, ...shelves, ...fronts]) project(rect, sample.shelf);
    if (needsFront) for (const rect of shelves) project(rect, sample.front);
    cuts.sort((a, b) => a[0] - b[0]);
    let cursor = row.from;
    const segments = [];
    for (const [from, to] of cuts) {
      if (to <= cursor || from >= row.to) continue;
      if (from > cursor) segments.push([cursor, Math.min(from, row.to)]);
      cursor = Math.max(cursor, to);
    }
    if (cursor < row.to) segments.push([cursor, row.to]);
    for (const [from, to] of segments) {
      const packed = packRun(to - from, widths, packing);
      let position = compact?.alignEnd ? to - packed.reduce((sum, size) => sum + size, 0) : from;
      for (const size of packed) {
        const candidate = make(position, size);
        if (valid(candidate)) { shelves.push(candidate.shelf); if (needsFront) fronts.push(candidate.front); }
        position += size;
      }
    }
  }
  for (const row of rows) addRow(row);
  if (center) for (let x = d + aisle; x + 2 * d + aisle <= W - d + 1e-7; x += 2 * d + aisle) {
    addRow({ from: d + aisle, to: H - d - aisle, x, central: true, facing: "left" });
    addRow({ from: d + aisle, to: H - d - aisle, x: x + d, central: true, facing: "right" });
  }
  return { id: compact ? `corners-${compact.order.join("-")}-${compact.alignEnd}-${center}` : `perimeter-${reverse}-${center}`, label: compact ? "Paredes com cantos a 90°" : "Paredes com acesso frontal", cornerAccessRestricted: !!compact, shelves, reserved, fronts, height, area: shelves.reduce((n, s) => n + s.w * s.h, 0), runLength: shelves.reduce((n, s) => n + s.runWidth, 0), centralCount: shelves.filter((s) => s.central).length };
}


function fixedParallelRows(config, widths, height, packing) {
  const count = config.rowCount;
  const horizontal = config.rowDirection === "width";
  const span = horizontal ? config.length : config.width;
  const run = horizontal ? config.width : config.length;
  const gap = count > 1 ? (span - count * config.depth) / (count - 1) : 0;
  if (!Number.isInteger(count) || count < 2 || count > 100 || gap < config.aisle - 1e-7) return { plans: [], error: "Estas filas não cabem com o espaço mínimo escolhido. Reduza o número de filas, a profundidade ou o espaço mínimo entre filas." };
  const reserved = [doorClearance(config.width, config.length, config.doorWall, config.doorOffset, config.doorWidth, config.aisle)];
  const shelves = [];
  for (let index = 0; index < count; index++) {
    const cross = index * (config.depth + gap);
    const wall = index === 0 ? (horizontal ? "top" : "left") : index === count - 1 ? (horizontal ? "bottom" : "right") : "center";
    const cuts = reserved.filter((r) => horizontal ? cross < r.y + r.h - 1e-7 && cross + config.depth > r.y + 1e-7 : cross < r.x + r.w - 1e-7 && cross + config.depth > r.x + 1e-7).map((r) => horizontal ? [r.x, r.x + r.w] : [r.y, r.y + r.h]).sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    const segments = [];
    for (const [from, to] of cuts) { if (from > cursor) segments.push([cursor, Math.min(run, from)]); cursor = Math.max(cursor, to); }
    if (cursor < run) segments.push([cursor, run]);
    for (const [from, to] of segments) {
      let position = from;
      for (const size of packRun(to - from, widths, packing)) {
        shelves.push({ x: horizontal ? position : cross, y: horizontal ? cross : position, w: horizontal ? size : config.depth, h: horizontal ? config.depth : size, runWidth: size, depth: config.depth, height, central: wall === "center", wall, rowIndex: index });
        position += size;
      }
    }
  }
  return { error: "", plans: [{ id: `fixed-parallel-${horizontal}-${count}`, label: `${count} filas ao longo de ${run} m · intervalo ${gap.toFixed(2).replace(".", ",")} m`, shelves, reserved, height, rowGap: gap, rowCount: count, area: shelves.reduce((sum, shelf) => sum + shelf.w * shelf.h, 0), runLength: shelves.reduce((sum, shelf) => sum + shelf.runWidth, 0), centralCount: shelves.filter((shelf) => shelf.central).length }] };
}
