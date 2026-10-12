"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/header/LanguageContext";
import SimulatorDropdown from "@/components/simulador/SimulatorDropdown";
import SimulatorConfigurationOptions from "@/components/simulador/SimulatorConfigurationOptions";
import SimulatorSolutions, { buildSimilarSolutions } from "@/components/simulador/SimulatorSolutions";
import SimulatorSectionTabs from "@/components/simulador/SimulatorSectionTabs";
import SimulatorOrderModal from "@/components/simulador/SimulatorOrderModal";
import createQuoteLines from "@/components/simulador/createQuoteLines";
import budget from "@/assets/orcamento.json";

const products = budget.produtos.filter((product) => product.ref === 1);
const priceOf = (product) => Number(product?.["preço"]) || 0;
const unique = (values) => [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b);
const formatMeters = (millimeters) => `${(millimeters / 1000).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
const formatPrice = (price) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(price);

const frames = products.filter((item) => item.produto.startsWith("Bastidor Ligeiro ")).map((item) => {
  const match = item.produto.match(/(\d+)x(\d+)\s*mm/i);
  return { ...item, height: Number(match?.[1]), depth: Number(match?.[2]) };
});
const shelves = products.filter((item) => item.produto.startsWith("Tabuleiro ")).map((item) => {
  const match = item.produto.match(/(\d+)x(\d+)\s*mm/i);
  const capacity = Number(item.produto.match(/até\s*(\d+)\s*Kg/i)?.[1]) || 0;
  return { ...item, width: Number(match?.[1]), depth: Number(match?.[2]), capacity };
});
const braces = products.filter((item) => /^Travamento\s+\d+\s*mm$/i.test(item.produto)).map((item) => ({
  ...item,
  width: Number(item.produto.match(/(\d+)\s*mm/i)?.[1]),
}));
const widths = unique(shelves.map((item) => item.width));
const levelOptions = Array.from({ length: 10 }, (_, index) => index + 2);

// Odd runs alternate braced and unbraced bays, starting and ending braced.
// Even runs brace both bays when there are two, the ends when there are four,
// and from six onward brace the ends, third and antepenultimate bays. Extra
// braces are inserted only when three or more consecutive bays are unsupported.
function bracedBayIndexes(count) {
  if (count <= 0) return [];
  if (count % 2 === 1) return Array.from({ length: Math.ceil(count / 2) }, (_, index) => index * 2);
  if (count === 2) return [0, 1];
  if (count === 4) return [0, 3];
  const supportedIndexes = unique([0, 2, count - 3, count - 1]);
  let gapIndex = supportedIndexes.findIndex((index, position) => position > 0 && index - supportedIndexes[position - 1] > 3);
  while (gapIndex !== -1) {
    const previous = supportedIndexes[gapIndex - 1];
    const next = supportedIndexes[gapIndex];
    // Brace the middle bay of any run of three or more unsupported modules.
    supportedIndexes.splice(gapIndex, 0, Math.floor((previous + next) / 2));
    gapIndex = supportedIndexes.findIndex((index, position) => position > 0 && index - supportedIndexes[position - 1] > 3);
  }
  return supportedIndexes;
}

function bracesInBay(index, count, height) {
  const isEndBay = index === 0 || index === count - 1;
  return height >= 3000 && isEndBay ? 3 : 2;
}

function productForWidth(items, width, depth) {
  return items.filter((item) => item.width === width && item.depth === depth).sort((a, b) => priceOf(a) - priceOf(b))[0];
}

function buildModules(targetLength, sameWidth, selectedWidth, { height, depth, levels }) {
  const widthsToUse = sameWidth === true ? [selectedWidth] : widths;
  const frame = frames.find((item) => item.height === height && item.depth === depth);
  const moduleCostCache = new Map();
  const moduleCost = (width, bracedCount) => {
    const cacheKey = `${width}:${bracedCount}`;
    if (moduleCostCache.has(cacheKey)) return moduleCostCache.get(cacheKey);
    const shelf = productForWidth(shelves, width, depth);
    const brace = braces.find((item) => item.width === width);
    const cost = levels * priceOf(shelf) + bracedCount * priceOf(brace);
    moduleCostCache.set(cacheKey, cost);
    return cost;
  };
  let bestModules = [];
  let bestDistance = Infinity;
  let bestPrice = Infinity;

  const count750Options = widthsToUse.includes(750) ? Array.from({ length: Math.floor(30000 / 750) + 1 }, (_, count) => count) : [0];
  const count1000Options = widthsToUse.includes(1000) ? Array.from({ length: Math.floor(30000 / 1000) + 1 }, (_, count) => count) : [0];

  for (const count750 of count750Options) {
    for (const count1000 of count1000Options) {
      const count = count750 + count1000;
      const length = count750 * 750 + count1000 * 1000;
      if (!count || length > 30000) continue;
      const braceIndexes = bracedBayIndexes(count);
      const braceIndexSet = new Set(braceIndexes);
      const positions = Array.from({ length: count }, (_, index) => ({
        index,
        delta: moduleCost(750, braceIndexSet.has(index) ? bracesInBay(index, count, height) : 0)
          - moduleCost(1000, braceIndexSet.has(index) ? bracesInBay(index, count, height) : 0),
      })).sort((a, b) => a.delta - b.delta);
      let placements;
      if (count750 > 1 && count750 < count) {
        const leftCount = Math.ceil(count750 / 2);
        const rightCount = Math.floor(count750 / 2);
        const endLeft = [...Array.from({ length: leftCount }, (_, index) => index), ...Array.from({ length: rightCount }, (_, index) => count - rightCount + index)];
        const endRight = [...Array.from({ length: rightCount }, (_, index) => index), ...Array.from({ length: leftCount }, (_, index) => count - leftCount + index)];
        const centerStart = Math.floor((count - count750) / 2);
        const centered = Array.from({ length: count750 }, (_, index) => centerStart + index);
        const alternateCenterStart = Math.ceil((count - count750) / 2);
        const alternateCentered = Array.from({ length: count750 }, (_, index) => alternateCenterStart + index);
        placements = [endLeft, endRight, centered, alternateCentered];
      } else if (count750 === count) {
        placements = [Array.from({ length: count }, (_, index) => index)];
      } else {
        placements = [positions.slice(0, count750).map(({ index }) => index)];
      }
      let widthsByPosition = null;
      let price = Infinity;
      for (const placement of placements) {
        const currentWidths = Array(count).fill(1000);
        placement.forEach((index) => { currentWidths[index] = 750; });
        const currentPrice = priceOf(frame) * (count + 1) + currentWidths.reduce((sum, width, index) => (
          sum + moduleCost(width, braceIndexSet.has(index) ? bracesInBay(index, count, height) : 0)
        ), 0);
        if (currentPrice < price) {
          widthsByPosition = currentWidths;
          price = currentPrice;
        }
      }
      const distance = Math.abs(length - targetLength);
      if (distance < bestDistance || (distance === bestDistance && price < bestPrice)) {
        bestModules = widthsByPosition;
        bestDistance = distance;
        bestPrice = price;
      }
    }
  }

  return bestModules;
}

function ShelfPreview({ modules, height, depth, levels, rowCount, bracedIndexes, capacityLabel, solutions, selectedSolutionId, onSelectSolution, english }) {
  const formatMeters = (value) => `${(value / 1000).toLocaleString(english ? "en-IE" : "pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const svgWidth = 1200;
  const bottom = 440;
  const totalLength = modules.reduce((sum, value) => sum + value, 0);
  // Reserve room for the height and level dimensions so long rows remain fully visible.
  const sidePadding = 160;
  const scale = Math.min((svgWidth - sidePadding * 2) / totalLength, 330 / height);
  const rackWidth = totalLength * scale;
  const rackHeight = height * scale;
  const left = (svgWidth - rackWidth) / 2;
  const right = left + rackWidth;
  const top = bottom - rackHeight;
  // Keep uprights visually consistent as the row grows; do not scale their
  // thickness with the total rack width.
  const frameWidth = 5;
  const shelfHeight = Math.max(5, Math.min(12, rackHeight * 0.025)) / 1.5;
  const footHeight = Math.max(4, Math.min(8, shelfHeight * 0.75));
  const braceBaySet = new Set(bracedIndexes);
  const lowestShelfCenter = bottom - footHeight - shelfHeight / 2;
  const highestShelfCenter = top + shelfHeight / 2;
  const levelY = (level) => lowestShelfCenter - level * (lowestShelfCenter - highestShelfCenter) / (levels - 1);

  return (
    <div className="min-w-0 rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 md:p-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "Preview" : "Visualização"}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">{english ? "2D preview" : "Pré-visualização 2D"}</h2></div>
        <span className="simulator-pill rounded-full bg-[#f5f5f7] px-3 py-1.5 text-right text-sm font-medium text-[#6e6e73]">{modules.length} {english ? "module(s)" : "módulo(s)"} · {levels} {english ? "levels" : "níveis"} · {rowCount} {rowCount === 1 ? (english ? "row" : "fila") : (english ? "rows" : "filas")}</span>
      </div>
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} 545`} role="img" aria-label={english ? `Front view of light-duty shelving with ${modules.length} modules, ${formatMeters(height)} high and ${levels} levels` : `Vista frontal de estantes ligeiras com ${modules.length} módulos, ${formatMeters(height)} de altura e ${levels} níveis`} className="h-auto w-full">
          <defs>
            <linearGradient id="lightFrame" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#b8bdc3"/><stop offset="0.28" stopColor="#f4f5f6"/><stop offset="0.55" stopColor="#d5d9dd"/><stop offset="1" stopColor="#aeb4ba"/></linearGradient>
            <linearGradient id="lightShelf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f8f9fa"/><stop offset="0.36" stopColor="#dfe2e5"/><stop offset="1" stopColor="#c4c9ce"/></linearGradient>
          </defs>
          <text x="70" y="32" fill="#555" fontSize="18" fontWeight="600">{english ? "Front view · Total length: " : "Vista frontal · Comprimento total: "}{formatMeters(totalLength)}</text>
          <text x={svgWidth - 70} y="32" textAnchor="end" fill="#555" fontSize="18" fontWeight="600">{english ? "Height: " : "Altura: "}{formatMeters(height)}</text>
          <line x1={left} y1={top - 17} x2={right} y2={top - 17} stroke="#a6a6a6" strokeWidth="2"/><line x1={left} y1={top - 22} x2={left} y2={top - 12} stroke="#a6a6a6" strokeWidth="2"/><line x1={right} y1={top - 22} x2={right} y2={top - 12} stroke="#a6a6a6" strokeWidth="2"/>
          <text x={(left + right) / 2} y={top - 24} textAnchor="middle" fill="#666" fontSize="16" fontWeight="600">{formatMeters(totalLength)}</text>
          <line x1={left - 30} y1={top} x2={left - 30} y2={bottom} stroke="#a6a6a6" strokeWidth="2"/><line x1={left - 36} y1={top} x2={left - 24} y2={top} stroke="#a6a6a6" strokeWidth="2"/><line x1={left - 36} y1={bottom} x2={left - 24} y2={bottom} stroke="#a6a6a6" strokeWidth="2"/>
          <text x={left - 44} y={(top + bottom) / 2} transform={`rotate(-90 ${left - 44} ${(top + bottom) / 2})`} textAnchor="middle" fill="#666" fontSize="16" fontWeight="600">{formatMeters(height)}</text>

          {Array.from({ length: modules.length + 1 }, (_, index) => {
            const x = left + modules.slice(0, index).reduce((sum, value) => sum + value, 0) * scale;
            return <g key={`upright-${index}`}>
              <rect x={x - frameWidth / 2} y={top} width={frameWidth} height={rackHeight} rx="0.5" fill="url(#lightFrame)" stroke="#aeb4ba" strokeWidth="1"/>
              <path d={`M ${x - frameWidth * 0.12} ${top + 4} V ${bottom - footHeight}`} stroke="#fff" strokeOpacity="0.8" strokeWidth="1"/>
              <rect x={x - footHeight / 2} y={bottom - footHeight} width={footHeight} height={footHeight} rx="0.5" fill="#53585d"/>
              <rect x={x - footHeight * 0.22} y={bottom - footHeight * 0.72} width={footHeight * 0.44} height={footHeight * 0.44} rx="0.3" fill="#9ca1a6"/>
            </g>;
          })}

          {modules.map((moduleWidth, index) => {
            const precedingLength = modules.slice(0, index).reduce((sum, width) => sum + width, 0);
            // Start and end at the inner faces of the uprights so braces never
            // extend across the frame posts.
            const x1 = left + precedingLength * scale + frameWidth / 2 + 1;
            const x2 = left + (precedingLength + moduleWidth) * scale - frameWidth / 2 - 1;
            const interiorWidth = x2 - x1;
            const hasBrace = braceBaySet.has(index);
            const braceQuantity = hasBrace ? bracesInBay(index, modules.length, height) : 0;
            // The brace profile has the same physical thickness in 0.75 m and
            // 1 m bays. Scale it with the overall drawing so long rows stay tidy.
            const braceHeight = Math.max(4, Math.min(25, 150 * scale));
            const bracePositions = Array.from({ length: braceQuantity }, (_, braceIndex) => top + rackHeight * (0.2 + (0.6 * braceIndex) / Math.max(1, braceQuantity - 1)));
            return <g key={`bay-${index}`}>
              {bracePositions.map((braceY, braceIndex) => {
                const braceX1 = x1 - 0.5;
                const braceX2 = x2 + 0.5;
                const braceY1 = braceY - braceHeight / 2;
                const braceY2 = braceY + braceHeight / 2;
                const braceCenterX = (braceX1 + braceX2) / 2;
                const braceCenterY = (braceY1 + braceY2) / 2;
                const crossStroke = 0.35;
                return <g key={`brace-${braceIndex}`}>
                  <rect x={braceX1} y={braceY1} width={braceX2 - braceX1} height={braceHeight} rx="0.5" fill="url(#lightShelf)" stroke="#aeb4ba" strokeWidth="1"/>
                  <polygon points={`${braceX1 + 1},${braceY1 + 1} ${braceX1 + 1},${braceY2 - 1} ${braceCenterX},${braceCenterY}`} fill="#d7dbde" fillOpacity="0.65"/>
                  <polygon points={`${braceX2 - 1},${braceY1 + 1} ${braceX2 - 1},${braceY2 - 1} ${braceCenterX},${braceCenterY}`} fill="#d7dbde" fillOpacity="0.65"/>
                  <polygon points={`${braceX1 + 1},${braceY1 + 1} ${braceX2 - 1},${braceY1 + 1} ${braceCenterX},${braceCenterY}`} fill="#cbd0d4" fillOpacity="0.65"/>
                  <polygon points={`${braceX1 + 1},${braceY2 - 1} ${braceX2 - 1},${braceY2 - 1} ${braceCenterX},${braceCenterY}`} fill="#cbd0d4" fillOpacity="0.65"/>
                  <g stroke="#737b82" strokeWidth={crossStroke} strokeLinecap="butt">
                    <line x1={braceX1 + 2} y1={braceY1 + 1} x2={braceX2 - 2} y2={braceY2 - 1}/>
                    <line x1={braceX1 + 2} y1={braceY2 - 1} x2={braceX2 - 2} y2={braceY1 + 1}/>
                  </g>
                </g>;
              })}
              {Array.from({ length: levels }, (_, level) => {
                const y = levelY(level);
                return <g key={`shelf-${level}`}>
                  <rect x={x1} y={y - shelfHeight / 2} width={interiorWidth} height={shelfHeight} rx="0.5" fill="url(#lightShelf)" stroke="#c2c7cc" strokeWidth="1"/>
                  <path d={`M ${x1 + 3} ${y - shelfHeight * 0.18} H ${x2 - 3}`} stroke="#fff" strokeOpacity="0.95" strokeWidth={Math.max(1, shelfHeight * 0.12)}/>
                </g>;
              })}
              <line x1={x1} y1={bottom + 17} x2={x2} y2={bottom + 17} stroke="#c2c6ca" strokeWidth="1.5"/><line x1={x1} y1={bottom + 13} x2={x1} y2={bottom + 21} stroke="#c2c6ca" strokeWidth="1.5"/><line x1={x2} y1={bottom + 13} x2={x2} y2={bottom + 21} stroke="#c2c6ca" strokeWidth="1.5"/>
              <text x={(x1 + x2) / 2} y={bottom + 40} textAnchor="middle" fill="#666" fontSize="14">{formatMeters(moduleWidth)}</text>
            </g>;
          })}
          {Array.from({ length: levels - 1 }, (_, index) => {
            const lowerShelfBottom = levelY(index) - shelfHeight / 2;
            const upperShelfTop = levelY(index + 1) + shelfHeight / 2;
            const dimensionX = right + 20;
            const gapCenter = (lowerShelfBottom + upperShelfTop) / 2;
            const clearHeight = Math.max(0, (Math.max(0, lowestShelfCenter - highestShelfCenter) / (levels - 1) - shelfHeight) / scale);
            return <g key={`shelf-clearance-${index}`}>
              <line x1={dimensionX} y1={upperShelfTop} x2={dimensionX} y2={lowerShelfBottom} stroke="#a6a6a6" strokeWidth="1.5"/>
              <line x1={dimensionX - 4} y1={upperShelfTop} x2={dimensionX + 4} y2={upperShelfTop} stroke="#a6a6a6" strokeWidth="1.5"/>
              <line x1={dimensionX - 4} y1={lowerShelfBottom} x2={dimensionX + 4} y2={lowerShelfBottom} stroke="#a6a6a6" strokeWidth="1.5"/>
              <text x={dimensionX + 8} y={gapCenter + 4} fill="#666" fontSize="13">{formatMeters(clearHeight)}</text>
            </g>;
          })}
          <text x={svgWidth - 70} y="505" textAnchor="end" fill="#ff5500" fontSize="15" fontWeight="700">{capacityLabel}</text>
          <g transform="translate(70 530)" fontSize="13" fill="#777"><rect width="9" height="9" rx="1" fill="#c5cbd0"/><text x="15" y="9">{english ? "Frame" : "Bastidor"}</text><rect x="105" width="9" height="9" rx="1" fill="#e3e6e9"/><text x="120" y="9">{english ? "Shelf" : "Tabuleiro"}</text><path d="M 220 1 L 229 9 M 220 9 L 229 1" stroke="#92999f" strokeWidth="2"/><text x="236" y="9">{english ? "Brace" : "Travamento"}</text></g>
        </svg>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#86868b] sm:text-sm">{english ? "Each level includes one shelf. The marked braces reinforce the structure." : "Cada nível inclui um tabuleiro. Os travamentos assinalados reforçam a estrutura."}</p>
      <SimulatorSolutions solutions={solutions} selectedId={selectedSolutionId} onSelect={onSelectSolution} />
    </div>
  );
}

export default function SimulatorEstantesLigeiras({ onQuoteDataChange }) {
  const [orderOpen, setOrderOpen] = useState(false);
  const orderQuoteRef = useRef(null);
  const drawingRef = useRef(null);
  const { language } = useLanguage();
  const english = language === "en";
  const formatMeters = (value) => `${(value / 1000).toLocaleString(english ? "en-IE" : "pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const formatPrice = (value) => new Intl.NumberFormat(english ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR" }).format(value);
  const [desiredLength, setDesiredLength] = useState("1.00");
  const [rowCount, setRowCount] = useState(1);
  const [sameShelfLength, setSameShelfLength] = useState(false);
  const [desiredShelfLength, setDesiredShelfLength] = useState(1000);
  const [height, setHeight] = useState(2000);
  const [depth, setDepth] = useState(400);
  const [levels, setLevels] = useState(4);
  const [selectedSolutionId, setSelectedSolutionId] = useState("chosen");
  const enteredLength = Number(desiredLength);
  const isLengthUnavailable = enteredLength > 30;
  const targetLength = enteredLength > 0 ? Math.min(30, enteredLength) * 1000 : 1000;
  const fixedShelfLength = sameShelfLength === true;
  const baseModules = useMemo(() => buildModules(targetLength, fixedShelfLength, desiredShelfLength, { height, depth, levels }), [targetLength, fixedShelfLength, desiredShelfLength, height, depth, levels]);
  const matchingFrame = frames.find((item) => item.height === height && item.depth === depth);
  const estimateModules = (candidate) => {
    const candidateBracedIndexes = bracedBayIndexes(candidate.length);
    const frameCost = priceOf(matchingFrame) * (candidate.length + 1);
    const moduleCost = candidate.reduce((sum, width, index) => {
      const shelf = productForWidth(shelves, width, depth);
      const braceCount = candidateBracedIndexes.includes(index) ? bracesInBay(index, candidate.length, height) : 0;
      return sum + priceOf(shelf) * levels + priceOf(braces.find((item) => item.width === width)) * braceCount;
    }, 0);
    const gross = (frameCost + moduleCost) * rowCount;
    const rate = gross >= 2600 ? 0.15 : gross >= 1900 ? 0.10 : gross >= 1000 ? 0.05 : 0;
    return gross * (1 - rate);
  };
  const solutions = useMemo(() => buildSimilarSolutions(baseModules, targetLength, {
    getModules: (target) => buildModules(target, fixedShelfLength, desiredShelfLength, { height, depth, levels }),
    getTotalLength: (candidate) => candidate.reduce((sum, width) => sum + width, 0),
    getPrice: estimateModules,
    step: 125,
    maxSteps: 80,
  }), [baseModules, targetLength, fixedShelfLength, desiredShelfLength, height, depth, levels, rowCount]);
  const configKey = [desiredLength, rowCount, fixedShelfLength, desiredShelfLength, height, depth, levels].join("|");
  useEffect(() => setSelectedSolutionId("chosen"), [configKey]);
  const modules = solutions.find((solution) => solution.id === selectedSolutionId)?.modules ?? baseModules;
  const bracedIndexes = useMemo(() => bracedBayIndexes(modules.length), [modules.length]);
  const shelfProducts = modules.map((width) => productForWidth(shelves, width, depth));
  const frameCountPerRow = modules.length + 1;
  const estimatePerRow = priceOf(matchingFrame) * frameCountPerRow + modules.reduce((sum, width, index) => {
    const braceCount = bracedIndexes.includes(index) ? bracesInBay(index, modules.length, height) : 0;
    const braceProduct = braces.find((item) => item.width === width);
    return sum + priceOf(shelfProducts[index]) * levels + priceOf(braceProduct) * braceCount;
  }, 0);
  const estimate = estimatePerRow * rowCount;
  const discountRate = estimate >= 2600 ? 0.15 : estimate >= 1900 ? 0.10 : estimate >= 1000 ? 0.05 : 0;
  const discountAmount = estimate * discountRate;
  const discountedEstimate = estimate - discountAmount;
  const finalLength = modules.reduce((sum, value) => sum + value, 0);
  const widthDistribution = widths.map((width) => ({ width, count: modules.filter((item) => item === width).length })).filter((item) => item.count > 0);
  const shelfDistribution = widthDistribution.map(({ width, count }) => ({ width, count: count * levels * rowCount }));
  const braceDistribution = widthDistribution.map(({ width }) => ({
    width,
    count: modules.reduce((sum, moduleWidth, index) => (
      sum + (moduleWidth === width && bracedIndexes.includes(index) ? bracesInBay(index, modules.length, height) * rowCount : 0)
    ), 0),
  })).filter(({ count }) => count > 0);
  const shelfCapacity = shelfProducts.length ? Math.min(...shelfProducts.map((item) => item?.capacity || 0)) : 0;
  useEffect(() => {
    const entries = [
      { product: matchingFrame, quantity: frameCountPerRow * rowCount },
      ...shelfDistribution.map(({ width, count }) => ({ product: productForWidth(shelves, width, depth), quantity: count })),
      ...braceDistribution.map(({ width, count }) => ({ product: braces.find((item) => item.width === width), quantity: count })),
    ];
    const format = (value) => (value / 1000).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const quote = {
      items: createQuoteLines(entries, 1),
      discountPercent: discountRate * 100,
      total: discountedEstimate,
      details: `Estantes de carga ligeira · Comprimento por fila: ${format(finalLength)} m · Comprimento total: ${format(finalLength * rowCount)} m · Altura: ${format(height)} m · Profundidade: ${format(depth)} m · Níveis: ${levels} · Filas: ${rowCount} · Tabuleiros: ${shelfDistribution.map(({ width, count }) => `${count} × ${format(width)} m`).join(", ")} · Travamentos: ${braceDistribution.map(({ width, count }) => `${count} × ${format(width)} m`).join(", ") || "nenhum"} · Carga máxima por nível: ${shelfCapacity.toLocaleString("pt-PT")} kg`,
      unavailable: isLengthUnavailable || !matchingFrame || modules.length === 0,
    };
    orderQuoteRef.current = quote;
    onQuoteDataChange?.(quote);
  }, [onQuoteDataChange, matchingFrame, frameCountPerRow, rowCount, shelfDistribution, braceDistribution, discountRate, discountedEstimate, finalLength, height, depth, levels, shelfCapacity, isLengthUnavailable, modules.length]);

  function reset() {
    setDesiredLength("1.00"); setRowCount(1); setSameShelfLength(false); setDesiredShelfLength(1000); setHeight(2000); setDepth(400); setLevels(4);
  }
  function changeHeight(nextHeight) {
    setHeight(nextHeight);
    if (!frames.some((item) => item.height === nextHeight && item.depth === depth)) setDepth(unique(frames.filter((item) => item.height === nextHeight).map((item) => item.depth))[0]);
  }
  function changeDepth(nextDepth) {
    setDepth(nextDepth);
    if (!frames.some((item) => item.depth === nextDepth && item.height === height)) setHeight(unique(frames.filter((item) => item.depth === nextDepth).map((item) => item.height))[0]);
  }

  return (
    <section ref={drawingRef} className="min-h-screen bg-[#f8f8fa] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <header className="mx-auto mb-9 max-w-[1800px] sm:mb-12">
        <p className="mb-3 mt-[35px] text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73] lg:mt-5">{english ? "Configurator · Light-duty shelving" : "Configurador · Estantes ligeiras"}</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">{english ? "Shelving tailored to your space." : "Estantes à medida do seu espaço."}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">{english ? "Set the height, depth and length of your row. The estimate uses prices from the light-duty product catalogue." : "Configure a altura, profundidade e comprimento da sua fila. A estimativa usa os preços dos produtos ligeiros do catálogo."}</p>
      </header>
      <div className="mx-auto grid max-w-[1800px] gap-5 lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.75fr)] xl:gap-7">
        <div className="flex justify-start"><SimulatorSectionTabs group="storage" active="ligeiras" /></div>
        <div className="hidden lg:block" aria-hidden="true" />
      </div>

      <div className="mx-auto grid max-w-[1800px] items-start gap-5 lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.75fr)] xl:gap-7">
        <div className="order-2 w-full rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 lg:order-1 lg:p-8">
          <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "1 · Configuration" : "1 · Configuração"}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#1d1d1f]">{english ? "Choose dimensions" : "Escolha as medidas"}</h2></div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <label className="block min-w-0 space-y-2 sm:col-span-2"><span className="block text-sm font-semibold text-[#424245]">{english ? "Desired length per row (m)" : "Comprimento pretendido por fila (m)"}</span><div className="simulator-pill flex items-center rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-5 transition focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/10"><input type="text" inputMode="decimal" value={desiredLength} onClick={(event) => event.currentTarget.select()} onChange={(event) => setDesiredLength(event.target.value.slice(0, 6))} onBlur={() => { const value = Number(desiredLength); if (value > 0) setDesiredLength(value.toFixed(2)); }} className="w-full bg-transparent py-3.5 text-[15px] font-medium text-[#1d1d1f] outline-none" aria-label={english ? "Desired length per row in metres" : "Comprimento pretendido por fila em metros"}/><span className="text-sm font-medium text-[#86868b]">m</span></div>{isLengthUnavailable && <span className="mt-1 block text-sm font-medium text-red-600">{english ? "Lengths over 30.00 m are not available." : "Comprimentos superiores a 30,00 m não estão disponíveis."}</span>}</label>
            <SimulatorDropdown label={english ? "Frame height (m)" : "Altura do bastidor (m)"} value={height} onChange={changeHeight} options={unique(frames.filter((item) => item.depth === depth).map((item) => item.height))} format={formatMeters}/>
            <SimulatorDropdown label={english ? "Depth (m)" : "Profundidade (m)"} value={depth} onChange={changeDepth} options={unique(frames.filter((item) => item.height === height).map((item) => item.depth))} format={formatMeters}/>
            <SimulatorDropdown label={english ? "Number of levels" : "N.º de níveis"} value={levels} onChange={setLevels} options={levelOptions}/>
            <SimulatorConfigurationOptions rowCount={rowCount} onRowCountChange={setRowCount} sameBeamLength={fixedShelfLength} onSameBeamLengthChange={setSameShelfLength} desiredBeamLength={desiredShelfLength} onDesiredBeamLengthChange={setDesiredShelfLength} sameLengthToggleLabel={english ? "Shelves of the same length" : "Tabuleiros do mesmo comprimento"} sameLengthSelectLabel={english ? "Shelf length (m)" : "Comprimento dos tabuleiros (m)"} sameLengthOptions={widths} sameLengthFormat={formatMeters} automaticLengthMessage={english ? "When this option is off, the calculation can combine 0.75 m and 1.00 m shelves to get close to the requested length." : "Com esta opção desligada, o cálculo pode combinar tabuleiros de 0,75 m e 1,00 m para aproximar o comprimento pedido."}/>
          </div>

          <div className="mt-7 border-t border-[#e5e5e7] pt-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "Price estimate" : "Estimativa de preço"}</p><div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="text-4xl font-semibold tracking-[-0.04em] text-(--orange)">{isLengthUnavailable ? (english ? "Unavailable" : "Indisponível") : formatPrice(discountedEstimate)}</p>{!isLengthUnavailable && <span className="text-sm font-medium text-[#86868b]">{english ? "+ VAT" : "+ IVA"}</span>}</div><p className="mt-1 text-sm text-[#6e6e73]">{english ? `Total price for ${rowCount} identical row${rowCount === 1 ? "" : "s"}.` : `Preço total para ${rowCount} ${rowCount === 1 ? "fila" : "filas"} iguais.`}</p>{discountRate > 0 && !isLengthUnavailable && <p className="mt-2 text-sm font-semibold text-[#0879C0]">{english ? `${discountRate * 100}% discount applied: −${formatPrice(discountAmount)}` : `Desconto de ${discountRate * 100}% aplicado: −${formatPrice(discountAmount)}`}</p>}
            {!isLengthUnavailable && <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[30px] bg-[#f5f5f7] p-5 text-sm"><p className="col-span-2 flex items-baseline justify-between gap-2 border-b border-[#e5e5e7] pb-2"><span className="text-[#6e6e73]">{english ? "Total row length" : "Comprimento total das filas"}</span><strong className="font-semibold text-[#1d1d1f]">{formatMeters(finalLength * rowCount)}</strong></p><p><span className="block text-xs text-[#86868b]">{english ? "Length per row" : "Comprimento por fila"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(finalLength)}</strong></p><p><span className="block text-xs text-[#86868b]">{english ? "Height" : "Altura"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(height)}</strong></p><p><span className="block text-xs text-[#86868b]">{english ? "Depth" : "Profundidade"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(depth)}</strong></p><p><span className="block text-xs text-[#86868b]">{english ? "Module distribution" : "Distribuição dos módulos"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{widthDistribution.map(({ width, count }) => `${count} × ${formatMeters(width)}`).join(" · ")}</strong></p><p><span className="block text-xs text-[#86868b]">{english ? "Levels" : "Níveis"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{levels}</strong></p><p className="col-span-2"><span className="block text-xs text-[#86868b]">{english ? "Shelves by length" : "Tabuleiros por medida"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{shelfDistribution.map(({ width, count }) => `${count} × ${formatMeters(width)}`).join(" · ")}</strong></p><p className="col-span-2"><span className="block text-xs text-[#86868b]">{english ? "Braces by length" : "Travamentos por medida"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{braceDistribution.map(({ width, count }) => `${count} × ${formatMeters(width)}`).join(" · ") || (english ? "None" : "Nenhum")}</strong></p><p><span className="block text-xs text-[#86868b]">{english ? "Frames" : "Bastidores"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{frameCountPerRow * rowCount}</strong></p><p><span className="block text-xs text-[#86868b]">{english ? "Maximum load per level" : "Carga máxima por nível"}</span><strong className="mt-0.5 block font-semibold text-(--orange)">{shelfCapacity} kg</strong></p></div>}
            <div className="mt-5 grid grid-cols-[1fr_auto] gap-3"><button type="button" disabled={isLengthUnavailable} onClick={() => setOrderOpen(true)} className={`simulator-pill flex cursor-pointer items-center justify-center rounded-full bg-(--orange) px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50`}>{english ? "Order" : "Encomendar"}</button><button type="button" onClick={reset} className="simulator-pill cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]">{english ? "Reset" : "Recomeçar"}</button></div>
          </div><p className="mt-4 text-xs leading-relaxed text-[#86868b]">{english ? "VAT is added at the applicable rate. Delivery is not included. Configuration is subject to technical validation." : "Ao valor acresce IVA à taxa legal. Transporte não incluído. Configuração sujeita a validação técnica."}</p>
        </div>
        <div className="order-1 min-w-0 lg:order-2"><ShelfPreview modules={modules} height={height} depth={depth} levels={levels} rowCount={rowCount} bracedIndexes={bracedIndexes} capacityLabel={`${english ? "Maximum load per level" : "Carga máxima por nível"}: ${shelfCapacity.toLocaleString(english ? "en-IE" : "pt-PT")} kg`} solutions={solutions} selectedSolutionId={selectedSolutionId} onSelectSolution={setSelectedSolutionId} english={english}/></div>
      </div>
      <SimulatorOrderModal open={orderOpen} onClose={() => setOrderOpen(false)} total={orderQuoteRef.current?.total ?? discountedEstimate} details={orderQuoteRef.current?.details} items={orderQuoteRef.current?.items} discountPercent={orderQuoteRef.current?.discountPercent ?? discountRate * 100} drawingRef={drawingRef} english={english} />
    </section>
  );
}
