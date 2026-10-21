"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/header/LanguageContext";
import SimulatorDropdown from "@/components/simulador/SimulatorDropdown";
import SimulatorConfigurationOptions from "@/components/simulador/SimulatorConfigurationOptions";
import SimulatorSolutions, { buildSimilarSolutions } from "@/components/simulador/SimulatorSolutions";
import SimulatorSectionTabs from "@/components/simulador/SimulatorSectionTabs";
import SimulatorOrderModal from "@/components/simulador/SimulatorOrderModal";
import createQuoteLines from "@/components/simulador/createQuoteLines";
import useEditableLevels from "./useEditableLevels";
import ModuleLevelDimensions from "./ModuleLevelDimensions";
import LevelRemovalTargets from "./LevelRemovalTargets";
import budget from "@/assets/orcamento.json";

const products = budget.produtos.filter((product) => product.ref === 2);
const frames = products
  .filter((product) => product.produto.startsWith("Bastidor Industrial") && !product.produto.includes("L7100"))
  .map((product) => {
    const dimensions = product.produto.match(/(\d+)x(\d+)mm/);
    return { ...product, height: Number(dimensions?.[1]), depth: Number(dimensions?.[2]) };
  });
const beams = products
  .filter((product) => product.produto.startsWith("Vigas "))
  .map((product) => {
    const length = Number(product.produto.match(/Vigas\s+(\d+)\s*mm/i)?.[1]);
    const capacityMatch = product.produto.match(/suporta\s*(?:\+\s*de\s*)?(\d+)\s*kg/i);
    return { ...product, length, capacity: Number(capacityMatch?.[1]) || 0, capacityIsMinimum: product.produto.includes("+ de") };
  });
const safetyBrake = products.find((product) => product.produto === "Freio de segurança");
const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a - b);
const heights = unique(frames.map((frame) => frame.height));
const depths = unique(frames.map((frame) => frame.depth));
const beamLengths = unique(beams.map((beam) => beam.length));
const levelOptions = Array.from({ length: 11 }, (_, index) => index + 1);
const verticalClearanceRatio = 0.12;
const numericPrice = (product) => Number(product?.["preço"]) || 0;
const formatMeters = (millimeters) => `${(millimeters / 1000).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
const formatPrice = (price) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(price);

function findBestModules(targetLength, { height, depth, levels, sameBeamLength, desiredBeamLength }) {
  const target = Math.max(2300, Math.round(Number(targetLength)));
  const maxTotal = 30000 - 100;
  const frame = frames.find((item) => item.height === height && item.depth === depth);
  const moduleCosts = new Map(beamLengths.map((length) => {
    const beam = beams.find((item) => item.length === length);
    const cost = frame && beam && safetyBrake ? numericPrice(frame) + levels * (2 * numericPrice(beam) + 4 * numericPrice(safetyBrake)) : Infinity;
    return [length, cost];
  }));
  if (sameBeamLength) {
    const requestedLength = Math.round(Number(desiredBeamLength)) || beamLengths[0];
    const availableLengths = beamLengths.filter((length) => Number.isFinite(moduleCosts.get(length)));
    if (!availableLengths.length) return [];
    const selectedLength = availableLengths.reduce((best, length) => {
      const distance = Math.abs(length - requestedLength);
      const bestDistance = Math.abs(best - requestedLength);
      return distance < bestDistance || (distance === bestDistance && moduleCosts.get(length) < moduleCosts.get(best)) ? length : best;
    }, availableLengths[0]);
    let bestCount = 1;
    let bestDistance = Infinity;
    let cheapestCost = Infinity;
    for (let count = 1; count * (selectedLength + 100) <= maxTotal; count += 1) {
      const distance = Math.abs(count * (selectedLength + 100) + 100 - target);
      const cost = count * moduleCosts.get(selectedLength);
      if (distance < bestDistance || (distance === bestDistance && cost < cheapestCost)) {
        bestCount = count;
        bestDistance = distance;
        cheapestCost = cost;
      }
    }
    return Array(bestCount).fill(selectedLength);
  }
  const bestCost = Array(maxTotal + 1).fill(Infinity);
  const previousLength = Array(maxTotal + 1).fill(null);
  bestCost[0] = 0;
  for (let current = 1; current <= maxTotal; current += 1) {
    for (const moduleLength of beamLengths) {
      if (moduleLength + 100 <= current && bestCost[current - moduleLength - 100] + moduleCosts.get(moduleLength) < bestCost[current]) {
        bestCost[current] = bestCost[current - moduleLength - 100] + moduleCosts.get(moduleLength);
        previousLength[current] = moduleLength;
      }
    }
  }
  let total = 0;
  let bestDistance = Infinity;
  let cheapestCost = Infinity;
  for (let candidate = 1; candidate <= maxTotal; candidate += 1) {
    if (!Number.isFinite(bestCost[candidate])) continue;
    const distance = Math.abs(candidate + 100 - target);
    if (distance < bestDistance || (distance === bestDistance && bestCost[candidate] < cheapestCost)) {
      total = candidate;
      bestDistance = distance;
      cheapestCost = bestCost[candidate];
    }
  }
  const modules = [];
  while (total > 0 && previousLength[total]) {
    const moduleLength = previousLength[total];
    modules.push(moduleLength);
    total -= moduleLength + 100;
  }
  return modules;
}

function RackPreview({ activeLevels, levelsForModule, hasRemovedLevels, removeLevel, restoreLevels, modules, height, depth, levels, rowCount, capacityLabel, solutions, selectedSolutionId, onSelectSolution, english }) {
  const formatMeters = (value) => `${(value / 1000).toLocaleString(english ? "en-IE" : "pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const width = 1000;
  const bottom = 410;
  const beamLengthTotal = modules.reduce((sum, moduleLength) => sum + moduleLength, 0);
  const totalLength = beamLengthTotal + (modules.length + 1) * 100;
  const naturalHeight = 220 + (height / Math.max(...heights)) * 130;
  const visualRatio = totalLength / height;
  const rackHeight = Math.min(naturalHeight, (width - 260) / visualRatio);
  const rackWidth = rackHeight * visualRatio;
  const rackLeft = (width - rackWidth) / 2;
  const rackRight = rackLeft + rackWidth;
  const top = bottom - rackHeight;
  const floorClearance = rackHeight * verticalClearanceRatio;
  const scale = rackWidth / totalLength;
  const uprightWidth = 100 * scale;
  const beamHeight = Math.max(2.5, 100 * scale);
  const tabHeight = Math.max(3.5, beamHeight * 1.25);
  const topLevelInset = beamHeight + (tabHeight - beamHeight) / 2;
  const levelSpacing = Math.round((height * (1 - verticalClearanceRatio)) / Math.max(1, levels - 1));
  const levelGap = (rackHeight - floorClearance) / Math.max(1, levels - 1);
  const clearLevelSpacing = Math.max(0, levelSpacing - 100);

  return (
    <div className="site-glass min-w-0 flex-1 rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 md:p-9">
      <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "Preview" : "Visualização"}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">{english ? "Industrial pallet racking" : "Rack industrial para paletes"}</h2><p className="mt-1 text-xs text-[#86868b]">{english ? "Your configuration · 2D preview" : "A sua configuração · Pré-visualização 2D"}</p></div><span className="simulator-pill rounded-full bg-[#f5f5f7] px-3 py-1.5 text-right text-sm font-medium text-[#6e6e73]">{modules.length} {english ? "module(s)" : "módulo(s)"} · {activeLevels.length} {english ? "levels" : "níveis"} · {rowCount} {rowCount === 1 ? (english ? "row" : "fila") : (english ? "rows" : "filas")}</span></div>
      <div className="w-full overflow-hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#86868b]">
          <p>{english ? "Click a level to remove it from that module only. Other modules remain unchanged." : "Clique num nível para o retirar apenas desse módulo. As restantes estantes mantêm-se."}</p>
          {hasRemovedLevels && <button type="button" onClick={restoreLevels} className="cursor-pointer rounded-full border border-[#e5e5e7] px-3 py-1.5 font-medium text-[#0879c0]">{english ? "Restore levels" : "Repor níveis"}</button>}
        </div>
        <svg viewBox={`0 0 ${width} 490`} role="img" aria-label={english ? `Front view of an industrial rack row with ${modules.length} modules, ${formatMeters(height)} high, ${levels} levels, repeated ${rowCount} times` : `Vista frontal de uma fila de rack industrial com ${modules.length} módulos, ${formatMeters(height)} de altura, ${levels} níveis e repetida ${rowCount} vezes`} className="h-auto w-full">
          <defs>
            <linearGradient id="rackUprightFinish" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#07518e" />
              <stop offset="0.22" stopColor="#1684cf" />
              <stop offset="0.58" stopColor="#0874bd" />
              <stop offset="1" stopColor="#064b83" />
            </linearGradient>
            <linearGradient id="rackBeamFinish" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ff9a68" />
              <stop offset="0.2" stopColor="#ff6a25" />
              <stop offset="0.78" stopColor="#f4510b" />
              <stop offset="1" stopColor="#c83b00" />
            </linearGradient>
            <linearGradient id="rackFootFinish" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#073e69" />
              <stop offset="0.5" stopColor="#147fbd" />
              <stop offset="1" stopColor="#073e69" />
            </linearGradient>
          </defs>
          <text x="70" y="30" fill="#555" fontSize="18" fontWeight="600">{english ? "Front view 2D · Length per row: " : "Vista frontal 2D · Comprimento por fila: "}{formatMeters(totalLength)}</text>
          <text x={width - 70} y="30" textAnchor="end" fill="#555" fontSize="18" fontWeight="600">{english ? "Height: " : "Altura: "}{formatMeters(height)}</text>
          <line x1="35" y1={top} x2="35" y2={bottom} stroke="#a6a6a6" strokeWidth="2" /><line x1="28" y1={top} x2="42" y2={top} stroke="#a6a6a6" strokeWidth="2" /><line x1="28" y1={bottom} x2="42" y2={bottom} stroke="#a6a6a6" strokeWidth="2" />
          <text x={width - 70} y="55" textAnchor="end" fill="#777" fontSize="14">{english ? "Depth: " : "Profundidade: "}{formatMeters(depth)}</text>
          <text x="21" y={(top + bottom) / 2} transform={`rotate(-90 21 ${(top + bottom) / 2})`} textAnchor="middle" fill="#777" fontSize="16">{formatMeters(height)}</text>
          <g aria-label={`${english ? "Total length" : "Comprimento total"} ${formatMeters(totalLength)}`}>
            <line x1={rackLeft} y1={top - 12} x2={rackRight} y2={top - 12} stroke="#a6a6a6" strokeWidth="2" />
            <line x1={rackLeft} y1={top - 17} x2={rackLeft} y2={top - 7} stroke="#a6a6a6" strokeWidth="2" />
            <line x1={rackRight} y1={top - 17} x2={rackRight} y2={top - 7} stroke="#a6a6a6" strokeWidth="2" />
            <text x={(rackLeft + rackRight) / 2} y={top - 20} textAnchor="middle" fill="#666" fontSize="16" fontWeight="600">{formatMeters(totalLength)}</text>
          </g>
          {Array.from({ length: modules.length + 1 }, (_, index) => {
            const centerX = rackLeft + (50 + index * 100 + modules.slice(0, index).reduce((sum, item) => sum + item, 0)) * scale;
            const frameX = centerX - uprightWidth / 2;
            const slotWidth = Math.max(1.2, uprightWidth * 0.12);
            const slotHeight = Math.max(1.6, Math.min(3.2, uprightWidth * 0.11));
            const slotStep = Math.max(9, Math.min(15, rackHeight / 16));
            const slotCount = Math.max(0, Math.floor((rackHeight - 20) / slotStep));
            const footHeight = Math.max(1.4, Math.min(2.2, beamHeight * 0.18));
            return (
              <g key={`frame-${index}`}>
                <rect x={frameX} y={top} width={uprightWidth} height={rackHeight} rx={Math.min(2, uprightWidth / 8)} fill="#064b83" />
                <rect x={frameX + uprightWidth * 0.12} y={top} width={uprightWidth * 0.76} height={rackHeight - footHeight} fill="url(#rackUprightFinish)" />
                <path d={`M ${frameX + uprightWidth * 0.2} ${top + 2} V ${bottom - footHeight}`} fill="none" stroke="#73bdeb" strokeOpacity="0.7" strokeWidth={Math.max(0.7, uprightWidth * 0.035)} />
                {Array.from({ length: slotCount }, (_, slotIndex) => (
                  <g key={`slot-${slotIndex}`}>
                    <rect x={centerX - slotWidth / 2} y={top + 9 + slotIndex * slotStep} width={slotWidth} height={slotHeight} rx={slotHeight / 2} fill="#063f6d" fillOpacity="0.8" />
                    <rect x={centerX - slotWidth / 2} y={top + 9 + slotIndex * slotStep} width={Math.max(0.5, slotWidth * 0.3)} height={slotHeight * 0.55} rx={slotHeight / 2} fill="#8dc9ef" fillOpacity="0.8" />
                  </g>
                ))}
                <rect x={centerX - uprightWidth * 0.72} y={bottom - footHeight} width={uprightWidth * 1.44} height={footHeight} rx={Math.min(1.5, footHeight / 3)} fill="url(#rackFootFinish)" />
                <rect x={centerX - uprightWidth * 0.36} y={bottom - footHeight + 0.25} width={uprightWidth * 0.72} height={Math.max(0.3, footHeight * 0.18)} rx="0.5" fill="#81bfe4" fillOpacity="0.8" />
              </g>
            );
          })}
          {modules.map((moduleLength, moduleIndex) => {
            const precedingLength = modules.slice(0, moduleIndex).reduce((sum, item) => sum + item, 0);
            // Each clear beam span sits between two 100 mm uprights.
            const beamX = rackLeft + (100 + moduleIndex * 100 + precedingLength) * scale;
            const beamWidth = moduleLength * scale;
            const beamInnerX = beamX;
            const beamInnerWidth = beamWidth;
            const beam = beams.find((item) => item.length === moduleLength);
            const tabWidth = Math.max(2, uprightWidth * 0.5);
            return <g key={`beam-${moduleIndex}`}>
              {levelsForModule(moduleIndex).map((levelIndex) => {
                const levelY = levels === 1 ? (top + bottom + beamHeight) / 2 : bottom - floorClearance - (levelIndex * (rackHeight - floorClearance)) / Math.max(1, levels - 1);
                const y = levelIndex === levels - 1 ? Math.max(levelY, top + topLevelInset) : levelY;
                const beamTop = y - beamHeight;
                const tabY = beamTop - (tabHeight - beamHeight) / 2;
                const leftTabX = beamInnerX - tabWidth * 0.5;
                const rightTabX = beamInnerX + beamInnerWidth - tabWidth * 0.5;
                const rivetRadius = Math.max(0.65, Math.min(1.5, tabWidth * 0.12));
                return (
                  <g key={levelIndex}>
                    <rect x={beamInnerX} y={beamTop} width={beamInnerWidth} height={beamHeight} rx={Math.min(2, beamHeight * 0.14)} fill="url(#rackBeamFinish)" stroke="#c83b00" strokeWidth={Math.max(0.5, scale * 1.5)} />
                    <path d={`M ${beamInnerX + 2} ${beamTop + beamHeight * 0.2} H ${beamInnerX + beamInnerWidth - 2}`} fill="none" stroke="#ffd0b8" strokeOpacity="0.75" strokeWidth={Math.max(0.6, beamHeight * 0.07)} />
                    <path d={`M ${beamInnerX + 1} ${beamTop + beamHeight * 0.88} H ${beamInnerX + beamInnerWidth - 1}`} fill="none" stroke="#a82f00" strokeOpacity="0.7" strokeWidth={Math.max(0.6, beamHeight * 0.08)} />
                    <rect x={leftTabX} y={tabY} width={tabWidth} height={tabHeight} rx={Math.min(2, tabWidth * 0.16)} fill="url(#rackBeamFinish)" stroke="#c83b00" strokeWidth={Math.max(0.5, scale * 1.25)} />
                    <rect x={rightTabX} y={tabY} width={tabWidth} height={tabHeight} rx={Math.min(2, tabWidth * 0.16)} fill="url(#rackBeamFinish)" stroke="#c83b00" strokeWidth={Math.max(0.5, scale * 1.25)} />
                    {[leftTabX, rightTabX].map((tabX, tabIndex) => (
                      <g key={`connector-${tabIndex}`} fill="#a93609" fillOpacity="0.82">
                        <circle cx={tabX + tabWidth / 2} cy={tabY + tabHeight * 0.3} r={rivetRadius} />
                        <circle cx={tabX + tabWidth / 2} cy={tabY + tabHeight * 0.7} r={rivetRadius} />
                      </g>
                    ))}
                  </g>
                );
              })}
              <line x1={beamInnerX} y1={bottom + 8} x2={beamInnerX + beamInnerWidth} y2={bottom + 8} stroke="#a6a6a6" strokeWidth="1.5" />
              <line x1={beamInnerX} y1={bottom + 4} x2={beamInnerX} y2={bottom + 12} stroke="#a6a6a6" strokeWidth="1.5" />
              <line x1={beamInnerX + beamInnerWidth} y1={bottom + 4} x2={beamInnerX + beamInnerWidth} y2={bottom + 12} stroke="#a6a6a6" strokeWidth="1.5" />
              <text x={beamX + beamWidth / 2} y={bottom + 27} textAnchor="middle" fill="#666" fontSize="16">{formatMeters(moduleLength)}</text><title>{beam?.produto}</title>
            </g>;
          })}
          <text x={width - 70} y="460" textAnchor="end" fill="#ff5500" fontSize="15" fontWeight="700">{capacityLabel}</text>
          <g transform="translate(70 470)" fontSize="13" fill="#777"><rect width="8" height="8" fill="#1787ff" /><text x="13" y="8">{english ? "Frame" : "Bastidor"}</text><rect x="92" width="8" height="8" fill="#FF5500" /><text x="105" y="8">{english ? "Beam" : "Viga"}</text></g>
          {modules.map((length, moduleIndex) => {
            const left = rackLeft + (100 + moduleIndex * 100 + modules.slice(0, moduleIndex).reduce((sum, value) => sum + value, 0)) * scale;
            const right = left + length * scale;
            const moduleLevels = levelsForModule(moduleIndex);
            const yForLevel = (index) => levels === 1 ? (top + bottom + beamHeight) / 2 : Math.max(bottom - floorClearance - index * levelGap, index === levels - 1 ? top + topLevelInset : -Infinity);
            return <g key={`module-controls-${moduleIndex}`}>
              <ModuleLevelDimensions activeLevels={moduleLevels} yForLevel={yForLevel} thickness={beamHeight} x={right - Math.min(55, (right - left) * 0.35)} floorY={bottom} scale={scale} format={formatMeters} english={english} />
              <LevelRemovalTargets activeLevels={moduleLevels} yForLevel={(index) => yForLevel(index) - beamHeight / 2} left={left} right={right} removeLevel={(index) => removeLevel(index, moduleIndex)} english={english} />
            </g>;
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#86868b] sm:text-sm">{english ? "Dimensions are shown in the drawing; total length includes the frames." : "Cotas indicam as medidas; o comprimento total inclui os bastidores."}</p>
      <SimulatorSolutions solutions={solutions} selectedId={selectedSolutionId} onSelect={onSelectSolution} />
    </div>
  );
}

export default function SimulatorRacks({ onQuoteDataChange, adminMode = false, adminPanel, adminDiscountPercent = null }) {
  const [orderOpen, setOrderOpen] = useState(false);
  const orderQuoteRef = useRef(null);
  const drawingRef = useRef(null);
  const { language } = useLanguage();
  const english = language === "en";
  const formatMeters = (value) => `${(value / 1000).toLocaleString(english ? "en-IE" : "pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const formatPrice = (value) => new Intl.NumberFormat(english ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR" }).format(value);
  const [desiredLength, setDesiredLength] = useState("2.30");
  const [rowCount, setRowCount] = useState(1);
  const [sameBeamLength, setSameBeamLength] = useState(false);
  const [desiredBeamLength, setDesiredBeamLength] = useState(beamLengths[0] || 1000);
  const [height, setHeight] = useState(4000);
  const [depth, setDepth] = useState(1000);
  const { levels, setLevels, levelSlots, activeLevels, levelsForModule, hasRemovedLevels, removedKey, removeLevel, restoreLevels } = useEditableLevels(4);
  const [selectedSolutionId, setSelectedSolutionId] = useState("chosen");
  const enteredLength = Number(desiredLength);
  const isLengthUnavailable = enteredLength > 30;
  const targetLength = enteredLength > 0 ? Math.min(30, enteredLength) * 1000 : 2300;
  const availableHeights = unique(frames.filter((frame) => frame.depth === depth).map((frame) => frame.height));
  const availableDepths = unique(frames.filter((frame) => frame.height === height).map((frame) => frame.depth));
  const baseModules = useMemo(() => findBestModules(targetLength, { height, depth, levels, sameBeamLength, desiredBeamLength }), [targetLength, height, depth, levels, sameBeamLength, desiredBeamLength]);
  const matchingFrame = frames.find((frame) => frame.height === height && frame.depth === depth);
  const estimateModules = (candidate) => {
    const gross = (numericPrice(matchingFrame) * (candidate.length + 1) + candidate.reduce((sum, moduleLength, moduleIndex) => {
      const beam = beams.find((item) => item.length === moduleLength);
      return sum + (2 * numericPrice(beam) + 4 * numericPrice(safetyBrake)) * levelsForModule(moduleIndex).length;
    }, 0)) * rowCount;
    const rate = gross >= 2600 ? 0.15 : gross >= 1900 ? 0.10 : gross >= 1000 ? 0.05 : 0;
    return gross * (1 - rate);
  };
  const solutions = useMemo(() => buildSimilarSolutions(baseModules, targetLength, {
    getModules: (target) => findBestModules(target, { height, depth, levels, sameBeamLength, desiredBeamLength }),
    getTotalLength: (candidate) => candidate.reduce((sum, value) => sum + value, 0) + (candidate.length + 1) * 100,
    getPrice: estimateModules,
    step: 500,
    maxSteps: 8,
  }), [removedKey, baseModules, targetLength, height, depth, levels, sameBeamLength, desiredBeamLength, rowCount]);
  const configKey = [desiredLength, rowCount, sameBeamLength, desiredBeamLength, height, depth, levels].join("|");
  useEffect(() => setSelectedSolutionId("chosen"), [configKey]);
  const modules = solutions.find((solution) => solution.id === selectedSolutionId)?.modules ?? baseModules;
  useEffect(() => restoreLevels(), [modules.join(","), height, depth, rowCount, restoreLevels]);
  const moduleSubtotal = modules.reduce((sum, moduleLength, moduleIndex) => {
    const beam = beams.find((item) => item.length === moduleLength);
    return sum + (2 * numericPrice(beam) + 4 * numericPrice(safetyBrake)) * levelsForModule(moduleIndex).length;
  }, 0);
  const estimatePerRow = numericPrice(matchingFrame) * (modules.length + 1) + moduleSubtotal;
  const estimate = estimatePerRow * rowCount;
  const suggestedDiscountRate = estimate >= 2600 ? 0.15 : estimate >= 1900 ? 0.10 : estimate >= 1000 ? 0.05 : 0;
  const discountRate = adminMode && adminDiscountPercent !== null
    ? Math.min(100, Math.max(0, Number(adminDiscountPercent) || 0)) / 100
    : suggestedDiscountRate;
  const discountAmount = estimate * discountRate;
  const discountedEstimate = estimate - discountAmount;
  const finalLength = modules.length ? modules.reduce((sum, moduleLength) => sum + moduleLength, 0) + (modules.length + 1) * 100 : 0;
  const levelCapacity = modules.length ? Math.min(...modules.map((moduleLength) => beams.find((beam) => beam.length === moduleLength)?.capacity || 0)) : 0;
  const capacityIsMinimum = modules.length > 0 && modules.every((moduleLength) => beams.find((beam) => beam.length === moduleLength)?.capacityIsMinimum);
  const beamDistribution = [...new Set(modules)].sort((a, b) => a - b).map((length) => ({
    length,
    count: modules.reduce((sum, moduleLength, index) => sum + (moduleLength === length ? levelsForModule(index).length : 0), 0) * 2 * rowCount,
  }));
  useEffect(() => {
    const entries = [
      { product: matchingFrame, quantity: (modules.length + 1) * rowCount },
      ...[...new Set(modules)].map((length) => ({
        product: beams.find((item) => item.length === length),
        quantity: modules.reduce((sum, moduleLength, index) => sum + (moduleLength === length ? levelsForModule(index).length : 0), 0) * 2 * rowCount,
      })),
      { product: safetyBrake, quantity: modules.reduce((sum, _, index) => sum + levelsForModule(index).length, 0) * 4 * rowCount },
    ];
    const format = (value) => (value / 1000).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const quote = {
      items: createQuoteLines(entries, 2),
      discountPercent: discountRate * 100,
      total: discountedEstimate,
      details: `Racks para paletes · Comprimento por fila: ${format(finalLength)} m · Comprimento total: ${format(finalLength * rowCount)} m · Altura: ${format(height)} m · Profundidade: ${format(depth)} m · Níveis: ${levels} (posições de baixo para cima por módulo: ${modules.map((_, moduleIndex) => `${moduleIndex + 1}: ${levelsForModule(moduleIndex).map((index) => index + 1).join("/")}`).join("; ")} de ${levelSlots}) · Níveis por módulo: ${modules.map((_, index) => `${index + 1}: ${levelsForModule(index).length}`).join(", ")} · Linhas de estantes lado a lado: ${rowCount} · Vigas: ${beamDistribution.map(({ length, count }) => `${count} × ${format(length)} m`).join(", ")} · Carga máxima por par de vigas: ${capacityIsMinimum ? "> " : ""}${levelCapacity.toLocaleString("pt-PT")} kg`,
      unavailable: isLengthUnavailable || !matchingFrame || modules.length === 0,
    };
    orderQuoteRef.current = quote;
    onQuoteDataChange?.(quote);
  }, [removedKey, activeLevels.join(","), levelSlots, onQuoteDataChange, matchingFrame, modules, levels, rowCount, safetyBrake, discountRate, discountedEstimate, finalLength, height, depth, beamDistribution, capacityIsMinimum, levelCapacity, isLengthUnavailable]);

  function handleHeightChange(nextHeight) {
    const validDepths = unique(frames.filter((frame) => frame.height === nextHeight).map((frame) => frame.depth));
    setHeight(nextHeight);
    if (!validDepths.includes(depth)) setDepth(validDepths[0]);
  }
  function handleDepthChange(nextDepth) {
    const validHeights = unique(frames.filter((frame) => frame.depth === nextDepth).map((frame) => frame.height));
    setDepth(nextDepth);
    if (!validHeights.includes(height)) setHeight(validHeights[0]);
  }
  function reset() {
    setDesiredLength("2.30");
    setRowCount(1);
    setSameBeamLength(false);
    setDesiredBeamLength(beamLengths[0] || 1000);
    setHeight(4000);
    setDepth(1000);
    setLevels(4);
  }

  return (
    <section ref={drawingRef} className={adminMode ? "min-h-0 bg-transparent p-0" : "min-h-screen bg-[#f8f8fa] px-4 py-12 sm:px-6 lg:px-10 lg:py-16"}>
      {!adminMode && <header className="mx-auto mb-9 max-w-[1800px] sm:mb-12">
        <p className="mb-3 mt-[35px] text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73] lg:mt-5">{english ? "Configurator · Pallet racking" : "Configurador · Racks industriais"}</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">{english ? "Racking tailored to your operation." : "Racks à medida da sua operação."}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">{english ? "Configure a structure for palletised loads. Dimensions, capacities and estimates update as you make your selections." : "Configure a estrutura para carga paletizada. As medidas, capacidades e estimativa acompanham a seleção em tempo real."}</p>
      </header>}
      {!adminMode && <div className="mx-auto grid max-w-[1800px] gap-5 lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.75fr)] xl:gap-7">
        <div className="flex justify-start"><SimulatorSectionTabs group="storage" active="racks" /></div>
        <div className="hidden lg:block" aria-hidden="true" />
      </div>}
      <>
      <div className={`mx-auto grid max-w-[1800px] items-start gap-5 lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.75fr)] xl:gap-7 ${adminMode ? "lg:gap-4 xl:gap-5" : ""}`}>
        <div className="site-glass relative z-20 order-2 w-full rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 lg:order-1 lg:p-8">
          <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "1 · Configuration" : "1 · Configuração"}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#1d1d1f]">{english ? "Choose dimensions" : "Escolha as medidas"}</h2></div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <label className="block min-w-0 space-y-2 sm:col-span-2">
              <span className="block text-sm font-semibold text-[#424245]">{english ? "Total desired length (m)" : "Comprimento total pretendido (m)"}</span>
              <span className="block text-xs leading-relaxed text-[#86868b]">{english ? "Enter the metres of shelving in a straight line for one row." : "Indique os metros de estantes em linha reta para uma fila."}</span>
              <div className="flex items-center simulator-pill rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-5 transition focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/10">
                <input type="text" inputMode="decimal" value={desiredLength} onClick={(event) => event.currentTarget.select()} onChange={(event) => setDesiredLength(event.target.value.slice(0, 6))} onBlur={() => { const value = Number(desiredLength); if (value > 0) setDesiredLength(value.toFixed(2)); }} className="w-full bg-transparent py-3.5 text-[15px] font-medium text-[#1d1d1f] outline-none" aria-label={english ? "Total desired length in metres" : "Comprimento total pretendido em metros"} />
                <span className="text-sm font-medium text-[#86868b]">m</span>
              </div>
              {isLengthUnavailable && <span className="mt-1 block text-sm font-medium text-red-600">{english ? "Lengths over 30.00 m are not available." : "Comprimentos superiores a 30,00 m não estão disponíveis."}</span>}
            </label>
            <SimulatorDropdown label={english ? "Frame height (m)" : "Altura do bastidor (m)"} value={height} onChange={handleHeightChange} options={availableHeights.length ? availableHeights : heights} format={formatMeters} />
            <SimulatorDropdown label={english ? "Depth (m)" : "Profundidade (m)"} value={depth} onChange={handleDepthChange} options={availableDepths.length ? availableDepths : depths} format={formatMeters} />
            <SimulatorDropdown label={english ? "Number of levels" : "N.º de níveis"} value={levels} onChange={setLevels} options={levelOptions} />
            <SimulatorConfigurationOptions rowCount={rowCount} onRowCountChange={setRowCount} sameBeamLength={sameBeamLength} onSameBeamLengthChange={setSameBeamLength} desiredBeamLength={desiredBeamLength} onDesiredBeamLengthChange={setDesiredBeamLength} sameLengthToggleLabel={english ? "Beams of the same length" : "Vigas do mesmo comprimento"} sameLengthSelectLabel={english ? "Available beam length (m)" : "Medida disponível das vigas (m)"} sameLengthOptions={beamLengths} sameLengthFormat={formatMeters} automaticLengthMessage={english ? "When this option is off, beams of different lengths can be combined to get close to the requested length." : "Com esta opção desligada, o cálculo pode combinar vigas de diferentes comprimentos para aproximar o comprimento pedido."} />
          </div>
          <div className="mt-7 border-t border-[#e5e5e7] pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "Price estimate" : "Estimativa de preço"}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="text-4xl font-semibold tracking-[-0.04em] text-(--orange)">{isLengthUnavailable ? (english ? "Unavailable" : "Indisponível") : formatPrice(discountedEstimate)}</p>{!isLengthUnavailable && <span className="text-sm font-medium text-[#86868b]">{english ? "+ VAT" : "+ IVA"}</span>}</div>
            <p className="mt-1 text-sm text-[#6e6e73]">{english ? `Total price for ${rowCount} shelving line${rowCount === 1 ? "" : "s"} placed side by side.` : `Preço total para ${rowCount} ${rowCount === 1 ? "linha de estantes" : "linhas de estantes"} lado a lado.`}</p>
            {discountRate > 0 && !isLengthUnavailable && <p className="mt-2 text-sm font-semibold text-[#0879C0]">{english ? `${discountRate * 100}% discount applied: −${formatPrice(discountAmount)}` : `Desconto de ${discountRate * 100}% aplicado: −${formatPrice(discountAmount)}`}</p>}
            {!isLengthUnavailable && <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[30px] bg-[#f5f5f7] p-5 text-sm">
              <p className="col-span-2 flex items-baseline justify-between gap-2 border-b border-[#e5e5e7] pb-2"><span className="text-[#6e6e73]">{english ? "Total row length" : "Comprimento total das filas"}</span><strong className="font-semibold text-[#1d1d1f]">{formatMeters(finalLength * rowCount)}</strong></p>
              <p><span className="block text-xs text-[#86868b]">{english ? "Length per row" : "Comprimento por fila"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(finalLength)}</strong></p>
              <p><span className="block text-xs text-[#86868b]">{english ? "Height" : "Altura"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(height)}</strong></p>
              <p><span className="block text-xs text-[#86868b]">{english ? "Depth" : "Profundidade"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(depth)}</strong></p>
              <p><span className="block text-xs text-[#86868b]">{english ? "Levels" : "Níveis"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{levels}</strong></p>
              <p><span className="block text-xs text-[#86868b]">{english ? "Structure" : "Estrutura"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{english ? "Blue frames · orange beams" : "Bastidores azuis · vigas laranja"}</strong></p>
              <p><span className="block text-xs text-[#86868b]">{english ? "Identical rows" : "Filas iguais"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{rowCount}</strong></p>
              <p className="col-span-2"><span className="block text-xs text-[#86868b]">{english ? "Beams by length" : "Vigas por medida"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{beamDistribution.map(({ length, count }) => `${count} × ${formatMeters(length)}`).join(" · ")}</strong></p>
              <p className="col-span-2 border-t border-[#e5e5e7] pt-2 text-[#6e6e73]">{english ? "Maximum load per beam pair" : "Carga máxima por par de vigas"} <strong className="font-semibold text-(--orange)">{capacityIsMinimum ? "> " : ""}{levelCapacity.toLocaleString(english ? "en-IE" : "pt-PT")} kg</strong></p>
            </div>}
            <div className={`mt-5 grid gap-3 ${adminMode ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>{!adminMode && <button type="button" disabled={isLengthUnavailable} onClick={() => setOrderOpen(true)} className="flex cursor-pointer items-center justify-center simulator-pill rounded-full bg-(--orange) px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">{english ? "Order" : "Encomendar"}</button>}<button type="button" onClick={reset} className="cursor-pointer simulator-pill rounded-full border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]">{adminMode ? (english ? "Reset configuration" : "Repor configuração") : (english ? "Reset" : "Recomeçar")}</button></div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#86868b]">{english ? "VAT is added at the applicable rate. Delivery is not included. Configuration is subject to technical validation." : "Ao valor acresce IVA à taxa legal. Transporte não incluído. Configuração sujeita a validação técnica."}</p>
          {!matchingFrame && <p className="mt-3 rounded-[30px] bg-amber-50 p-3 text-sm text-amber-800">{english ? "No frame with this height and depth combination is available in catalogue ref. 2." : "Não existe um bastidor com esta combinação de altura e profundidade no catálogo ref. 2."}</p>}
        </div>
        <div className="order-1 min-w-0 space-y-4 lg:order-2">
          {isLengthUnavailable
            ? <div className="site-glass rounded-[30px] border border-[#e5e5e7] bg-white p-7 shadow-[0_12px_40px_rgba(0,0,0,0.05)]"><h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">{english ? "Industrial pallet racking" : "Rack industrial para paletes"}</h2><p className="mt-1 text-xs text-[#86868b]">{english ? "Your configuration · 2D preview" : "A sua configuração · Pré-visualização 2D"}</p><p className="mt-4 rounded-[30px] bg-red-50 p-4 text-sm text-red-700">{english ? "Lengths over 30.00 m are not available." : "Comprimentos superiores a 30.00 m não estão disponíveis."}</p></div>
            : <RackPreview modules={modules} height={height} depth={depth} levels={levelSlots} activeLevels={activeLevels} levelsForModule={levelsForModule} hasRemovedLevels={hasRemovedLevels} removeLevel={removeLevel} restoreLevels={restoreLevels} rowCount={rowCount} capacityLabel={`${english ? "Maximum load per beam pair" : "Carga máxima por par de vigas"}: ${capacityIsMinimum ? "> " : ""}${levelCapacity.toLocaleString(english ? "en-IE" : "pt-PT")} kg`} solutions={solutions} selectedSolutionId={selectedSolutionId} onSelectSolution={setSelectedSolutionId} english={english} />}
          {adminMode && adminPanel}
        </div>
      </div>
      </>
      {!adminMode && <SimulatorOrderModal open={orderOpen} onClose={() => setOrderOpen(false)} total={orderQuoteRef.current?.total ?? discountedEstimate} details={orderQuoteRef.current?.details} items={orderQuoteRef.current?.items} discountPercent={orderQuoteRef.current?.discountPercent ?? discountRate * 100} drawingRef={drawingRef} english={english} />}
    </section>
  );
}
