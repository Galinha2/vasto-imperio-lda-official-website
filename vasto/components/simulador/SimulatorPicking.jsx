"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/header/LanguageContext";
import SimulatorDropdown from "@/components/simulador/SimulatorDropdown";
import SimulatorConfigurationOptions from "@/components/simulador/SimulatorConfigurationOptions";
import SimulatorSolutions, { buildSimilarSolutions } from "@/components/simulador/SimulatorSolutions";
import SimulatorSectionTabs from "@/components/simulador/SimulatorSectionTabs";
import SimulatorOrderModal from "@/components/simulador/SimulatorOrderModal";
import createQuoteLines from "@/components/simulador/createQuoteLines";
import { isWorkbenchFrame, workbenchLevelPosition } from "@/lib/workbench.mjs";
import { pickingDiscountRate } from "@/lib/picking-discount.mjs";
import { levelClearance } from "@/lib/editable-levels.mjs";
import useEditableLevels from "./useEditableLevels";
import FloorLevelDimension from "./FloorLevelDimension";
import LevelRemovalTargets from "./LevelRemovalTargets";
import budget from "@/assets/orcamento.json";

const products = budget.produtos.filter((product) => product.ref === 3);
const beams = products
  .filter((product) => product.produto.startsWith("Viga Z"))
  .map((product) => ({
    ...product,
    length: Number(product.produto.match(/c\/\s*(\d+)mm/)?.[1]),
  }));
const frames = products
  .filter((product) => product.produto.startsWith("Bastidor Picking"))
  .map((product) => {
    const dimensions = product.produto.match(/(\d+)x(\d+)mm/);
    return {
      ...product,
      height: Number(dimensions?.[1]),
      depth: Number(dimensions?.[2]),
      galvanized: product.produto.includes("Galvanizado"),
    };
  });
const shelves = products
  .filter((product) => product.produto.startsWith("Prat."))
  .map((product) => {
    const dimensions = product.produto.match(/(\d+)x(\d+)x(\d+)mm/);
    return {
      ...product,
      length: Number(dimensions?.[1]),
      depth: Number(dimensions?.[2]),
      material: product.produto.startsWith("Prat. Madeira") ? "Aglomerado" : "Metálica",
    };
  });

const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a - b);
const heights = unique(frames.map((frame) => frame.height).filter((height) => height >= 1000));
const depths = unique(frames.map((frame) => frame.depth));
const beamLengths = unique(beams.map((beam) => beam.length));
const levelOptions = Array.from({ length: 10 }, (_, index) => index + 2);
const verticalClearanceRatio = 0.12;
const numericPrice = (product) => Number(product?.["preço"]) || 0;
const formatMeters = (millimeters) => `${(millimeters / 1000).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
const formatPrice = (price) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(price);
const safetyBrake = products.find((product) => product.produto === "Freio de segurança Picking");

function reinforcementProduct(kind, depth, floorType) {
  const name = floorType === "Metálica"
    ? "Reforço para prateleiras metálicas"
    : `Reforço ${kind}`;
  return products.find((product) => product.produto.startsWith(name) && product.produto.includes(`${depth}mm`));
}

function reinforcementPrice(length, depth, floorType) {
  const centralCount = length <= 2000 ? 1 : 2;
  const lateralCount = 2;
  const central = reinforcementProduct("central", depth, floorType);
  const lateral = reinforcementProduct("lateral", depth, floorType);
  return centralCount * numericPrice(central) + lateralCount * numericPrice(lateral);
}

function findBestModules(targetLength, { height, depth, levels, floorType, galvanized, reinforcedBeams, sameBeamLength, desiredBeamLength }) {
  const target = Math.max(1000, Math.round(Number(targetLength)));
  const maxTotal = target + Math.max(...beamLengths);
  const moduleCosts = new Map(beamLengths.map((length) => {
    const beamProfile = reinforcedBeams ? "Viga Z100" : "Viga Z60";
    const beam = beams.find((product) => product.length === length && product.produto.includes(beamProfile));
    const shelf = shelves.find((product) => product.length === length && product.depth === depth && product.material === floorType);
    const frame = frames.find((product) => product.height === height && product.depth === depth && product.galvanized === galvanized);
    const reinforcement = reinforcementPrice(length, depth, floorType);
    const prices = [frame, beam, shelf, safetyBrake].map((product) => product?.["preço"]);
    const hasAllPrices = prices.every((price) => typeof price === "number" && Number.isFinite(price));
    return [length, hasAllPrices ? prices[0] + levels * (2 * prices[1] + prices[2] + reinforcement + 4 * prices[3]) : Infinity];
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
    for (let count = 1; count * selectedLength <= maxTotal; count += 1) {
      const distance = Math.abs(count * selectedLength + 50 - target);
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
      if (moduleLength <= current && bestCost[current - moduleLength] + moduleCosts.get(moduleLength) < bestCost[current]) {
        bestCost[current] = bestCost[current - moduleLength] + moduleCosts.get(moduleLength);
        previousLength[current] = moduleLength;
      }
    }
  }
  let total = 1;
  let bestDistance = Infinity;
  let cheapestCost = Infinity;
  for (let candidate = 1; candidate <= maxTotal; candidate += 1) {
    if (!Number.isFinite(bestCost[candidate])) continue;
    // Catalog lengths are nominal beam lengths. The row's final outside
    // measurement includes the additional 50 mm of the end upright.
    const distance = Math.abs(candidate + 50 - target);
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
    total -= moduleLength;
  }
  return modules;
}

function RackPreview({ activeLevels, removeLevel, restoreLevels, modules, height, depth, levels, floorType, galvanized, reinforcedBeams, rowCount, capacityLabel, solutions, selectedSolutionId, onSelectSolution, english, workbench = false }) {
  const formatMeters = (value) => `${(value / 1000).toLocaleString(english ? "en-IE" : "pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const width = 1000;
  const bottom = 410;
  const beamLengthTotal = modules.reduce((sum, moduleLength) => sum + moduleLength, 0);
  const totalLength = beamLengthTotal + 50;
  const naturalHeight = 220 + (height / Math.max(...heights)) * 130;
  const visualRatio = totalLength / height;
  const rackHeight = Math.min(naturalHeight, (width - 260) / visualRatio);
  const rackWidth = rackHeight * visualRatio;
  const rackLeft = (width - rackWidth) / 2;
  const rackRight = rackLeft + rackWidth;
  const top = bottom - rackHeight;
  const floorClearance = rackHeight * verticalClearanceRatio;
  const scale = rackWidth / totalLength;
  const uprightWidth = 50 * scale;
  const beamHeight = Math.max(2.5, (reinforcedBeams ? 110 : 75) * scale);
  const shelfThickness = Math.max(1, 18 * scale);
  const tabHeight = Math.max(2, beamHeight * 1.5);
  const topLevelInset = shelfThickness + beamHeight + (tabHeight - beamHeight) / 2;
  const heightLabel = formatMeters(height);
  const levelPosition = (index) => workbench
    ? workbenchLevelPosition(index, levels, top, rackHeight, topLevelInset)
    : Math.max(bottom - floorClearance - index * (rackHeight - floorClearance) / Math.max(1, levels - 1), index === levels - 1 ? top + topLevelInset : -Infinity);

  const levelSpacing = Math.round((height * (1 - verticalClearanceRatio)) / Math.max(1, levels - 1));
  const clearLevelSpacing = Math.max(0, levelSpacing - (reinforcedBeams ? 110 : 75));

  return (
    <div className="site-glass min-w-0 flex-1 rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 md:p-9">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "Preview" : "Visualização"}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">{workbench ? (english ? "Workbench" : "Bancada") : (english ? "Picking shelving" : "Estante de picking")}</h2><p className="mt-1 text-xs text-[#86868b]">{english ? "Your configuration · 2D preview" : "A sua configuração · Pré-visualização 2D"}</p>
        </div>
        <span className="simulator-pill rounded-full bg-[#f5f5f7] px-3 py-1.5 text-right text-sm font-medium text-[#6e6e73]">{modules.length} {english ? "module(s)" : "módulo(s)"} · {activeLevels.length} {english ? "levels" : "níveis"} · {rowCount} {rowCount === 1 ? (english ? "row" : "fila") : (english ? "rows" : "filas")}</span>
      </div>
      <div className="w-full overflow-hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#86868b]">
          <p>{english ? "Click a level to remove it from the entire row. Other levels keep their height." : "Clique num nível para o retirar de toda a fila. Os restantes mantêm a altura."}</p>
          {activeLevels.length < levels && <button type="button" onClick={restoreLevels} className="cursor-pointer rounded-full border border-[#e5e5e7] px-3 py-1.5 font-medium text-[#0879c0]">{english ? "Restore levels" : "Repor níveis"}</button>}
        </div>
        <svg viewBox={`0 0 ${width} 490`} role="img" aria-label={english ? `Front view of a row with ${modules.length} modules, ${heightLabel} high, ${levels} levels, repeated ${rowCount} times` : `Vista frontal de uma fila com ${modules.length} módulos, ${heightLabel} de altura, ${levels} níveis e repetida ${rowCount} vezes`} className="h-auto w-full">
          <defs>
            <linearGradient id="pickingFrameMetalFinish" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#64717d" />
              <stop offset="0.2" stopColor="#e3e8ec" />
              <stop offset="0.52" stopColor="#aab4bd" />
              <stop offset="0.8" stopColor="#f0f3f5" />
              <stop offset="1" stopColor="#687580" />
            </linearGradient>
            <linearGradient id="pickingFrameBlueFinish" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#0755a3" />
              <stop offset="0.24" stopColor="#2797ff" />
              <stop offset="0.58" stopColor="#1477d4" />
              <stop offset="1" stopColor="#06498e" />
            </linearGradient>
            <linearGradient id="pickingBeamFinish" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.28" stopColor="#f0f1f6" />
              <stop offset="0.8" stopColor="#d9dce5" />
              <stop offset="1" stopColor="#bec3cf" />
            </linearGradient>
            <linearGradient id="pickingMetalShelfFinish" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#f8fafb" />
              <stop offset="0.45" stopColor="#9ba7b2" />
              <stop offset="1" stopColor="#d5dce2" />
            </linearGradient>
            <linearGradient id="pickingWoodShelfFinish" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#806329" />
              <stop offset="0.32" stopColor="#65490c" />
              <stop offset="1" stopColor="#493407" />
            </linearGradient>
          </defs>
          <text x="70" y="30" fill="#555" fontSize="18" fontWeight="600">{english ? "Front view 2D · Length per row: " : "Vista frontal 2D · Comprimento por fila: "}{formatMeters(totalLength)}</text>
          <text x={width - 70} y="30" textAnchor="end" fill="#555" fontSize="18" fontWeight="600">{english ? "Height: " : "Altura: "}{heightLabel}</text>
          <line x1="35" y1={top} x2="35" y2={bottom} stroke="#a6a6a6" strokeWidth="2" />
          <line x1="28" y1={top} x2="42" y2={top} stroke="#a6a6a6" strokeWidth="2" />
          <line x1="28" y1={bottom} x2="42" y2={bottom} stroke="#a6a6a6" strokeWidth="2" />
          <text x={width - 70} y="55" textAnchor="end" fill="#777" fontSize="14">{english ? "Depth: " : "Profundidade: "}{formatMeters(depth)}</text>
          <text x="21" y={(top + bottom) / 2} transform={`rotate(-90 21 ${(top + bottom) / 2})`} textAnchor="middle" fill="#777" fontSize="16">{heightLabel}</text>
          <g aria-label={`${english ? "Total length" : "Comprimento total"} ${formatMeters(totalLength)}`}>
            <line x1={rackLeft} y1={top - 12} x2={rackRight} y2={top - 12} stroke="#a6a6a6" strokeWidth="2" />
            <line x1={rackLeft} y1={top - 17} x2={rackLeft} y2={top - 7} stroke="#a6a6a6" strokeWidth="2" />
            <line x1={rackRight} y1={top - 17} x2={rackRight} y2={top - 7} stroke="#a6a6a6" strokeWidth="2" />
            <text x={(rackLeft + rackRight) / 2} y={top - 20} textAnchor="middle" fill="#666" fontSize="16" fontWeight="600">{formatMeters(totalLength)}</text>
          </g>
          {Array.from({ length: modules.length + 1 }, (_, index) => {
            const centerX = rackLeft + (25 + modules.slice(0, index).reduce((sum, item) => sum + item, 0)) * scale;
            const frameX = centerX - uprightWidth / 2;
            const frameFill = galvanized ? "url(#pickingFrameMetalFinish)" : "url(#pickingFrameBlueFinish)";
            const slotWidth = Math.max(1.1, uprightWidth * 0.12);
            const slotHeight = Math.max(1.4, Math.min(3, uprightWidth * 0.12));
            const slotStep = Math.max(9, Math.min(15, rackHeight / 16));
            const slotCount = Math.max(0, Math.floor((rackHeight - 20) / slotStep));
            const footHeight = Math.max(1.4, Math.min(2.2, beamHeight * 0.18));
            return (
              <g key={`upright-base-${index}`}>
                <rect x={frameX} y={top} width={uprightWidth} height={rackHeight} rx={Math.min(2, uprightWidth / 8)} fill={galvanized ? "#687580" : "#06498e"} />
                <rect x={frameX + uprightWidth * 0.12} y={top} width={uprightWidth * 0.76} height={rackHeight - footHeight} fill={frameFill} />
                <path d={`M ${frameX + uprightWidth * 0.2} ${top + 2} V ${bottom - footHeight}`} fill="none" stroke={galvanized ? "#ffffff" : "#8ecbff"} strokeOpacity="0.75" strokeWidth={Math.max(0.65, uprightWidth * 0.035)} />
                {Array.from({ length: slotCount }, (_, slotIndex) => (
                  <g key={`slot-${slotIndex}`}>
                    <rect x={centerX - slotWidth / 2} y={top + 9 + slotIndex * slotStep} width={slotWidth} height={slotHeight} rx={slotHeight / 2} fill={galvanized ? "#63717d" : "#06498e"} fillOpacity="0.8" />
                    <rect x={centerX - slotWidth / 2} y={top + 9 + slotIndex * slotStep} width={Math.max(0.5, slotWidth * 0.3)} height={slotHeight * 0.55} rx={slotHeight / 2} fill={galvanized ? "#ffffff" : "#a7d8ff"} fillOpacity="0.8" />
                  </g>
                ))}
                <rect x={centerX - uprightWidth * 0.72} y={bottom - footHeight} width={uprightWidth * 1.44} height={footHeight} rx={Math.min(1.5, footHeight / 3)} fill={galvanized ? "url(#pickingFrameMetalFinish)" : "url(#pickingFrameBlueFinish)"} />
                <rect x={centerX - uprightWidth * 0.36} y={bottom - footHeight + 0.25} width={uprightWidth * 0.72} height={Math.max(0.3, footHeight * 0.18)} rx="0.5" fill={galvanized ? "#ffffff" : "#8ecbff"} fillOpacity="0.8" />
              </g>
            );
          })}
          {modules.map((moduleLength, moduleIndex) => {
            const precedingLength = modules.slice(0, moduleIndex).reduce((sum, item) => sum + item, 0);
            const x = rackLeft + (50 + precedingLength) * scale;
            const moduleWidth = (moduleLength - 50) * scale;
            // Beams meet the uprights at their centerline (halfway through their inner boundary).
            const beamX = rackLeft + (25 + precedingLength) * scale;
            const beamWidth = moduleLength * scale;
            const beamInnerX = beamX + uprightWidth / 2;
            const beamInnerWidth = beamWidth - uprightWidth;
            const beamProfile = reinforcedBeams ? "Viga Z100" : "Viga Z60";
            const beam = beams.find((product) => product.length === moduleLength && product.produto.includes(beamProfile));
            return (
              <g key={`${moduleIndex}-${moduleLength}`}>
                {activeLevels.map((index) => {
                  const levelY = levelPosition(index);
                  // Keep the top shelf and its beams inside the upright's top edge.
                  const y = index === levels - 1 ? Math.max(levelY, top + topLevelInset) : levelY;
                  const beamTop = y - beamHeight;
                  const upperBeamHeight = beamHeight * 0.55;
                  const highlightHeight = Math.max(0.6, upperBeamHeight * 0.1);
                  const materialFill = floorType === "Aglomerado" ? "url(#pickingWoodShelfFinish)" : "url(#pickingMetalShelfFinish)";
                  const materialStroke = floorType === "Aglomerado" ? "#4a3508" : "#687580";
                  return (
                    <g key={index}>
                      <rect x={beamInnerX} y={beamTop} width={beamInnerWidth} height={upperBeamHeight} rx={Math.min(2, beamHeight * 0.16)} fill="url(#pickingBeamFinish)" stroke="#b9bec8" strokeWidth={Math.max(0.5, scale)} />
                      <rect x={beamInnerX} y={beamTop + upperBeamHeight} width={beamInnerWidth} height={beamHeight - upperBeamHeight} fill="url(#pickingBeamFinish)" />
                      <path d={`M ${beamInnerX + 1} ${beamTop + highlightHeight} H ${beamInnerX + beamInnerWidth - 1}`} fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth={highlightHeight} />
                      <path d={`M ${beamInnerX + 1} ${beamTop + beamHeight - 0.5} H ${beamInnerX + beamInnerWidth - 1}`} fill="none" stroke="#a9afba" strokeOpacity="0.75" strokeWidth={Math.max(0.5, scale * 0.8)} />
                      <rect
                        x={x}
                        y={beamTop - shelfThickness}
                        width={moduleWidth}
                        height={shelfThickness}
                        rx={Math.min(2, shelfThickness * 0.12)}
                        fill={materialFill}
                        stroke={materialStroke}
                        strokeWidth={Math.max(0.5, scale * 0.9)}
                      />
                      <path d={`M ${x + 1} ${beamTop - shelfThickness * 0.35} H ${x + moduleWidth - 1}`} fill="none" stroke={floorType === "Aglomerado" ? "#b29250" : "#ffffff"} strokeOpacity="0.7" strokeWidth={Math.max(0.5, shelfThickness * 0.1)} />
                    </g>
                  );
                })}
                <line x1={beamInnerX} y1={bottom + 8} x2={beamInnerX + beamInnerWidth} y2={bottom + 8} stroke="#a6a6a6" strokeWidth="1.5" />
                <line x1={beamInnerX} y1={bottom + 4} x2={beamInnerX} y2={bottom + 12} stroke="#a6a6a6" strokeWidth="1.5" />
                <line x1={beamInnerX + beamInnerWidth} y1={bottom + 4} x2={beamInnerX + beamInnerWidth} y2={bottom + 12} stroke="#a6a6a6" strokeWidth="1.5" />
                <text x={x + moduleWidth / 2} y={bottom + 27} textAnchor="middle" fill="#666" fontSize="16">{formatMeters(moduleLength)}</text>
                <title>{beam?.produto}</title>
              </g>
            );
          })}
          {modules.map((moduleLength, moduleIndex) => {
            const precedingLength = modules.slice(0, moduleIndex).reduce((sum, item) => sum + item, 0);
            const beamX = rackLeft + (25 + precedingLength) * scale;
            const beamWidth = moduleLength * scale;
            const beamInnerX = beamX + uprightWidth / 2;
            const beamInnerWidth = beamWidth - uprightWidth;
            const tabWidth = Math.max(2, uprightWidth * 0.5);
            return (
              <g key={`beam-end-tabs-${moduleIndex}`}>
                {activeLevels.map((levelIndex) => {
                  const levelY = levelPosition(levelIndex);
                  const y = levelIndex === levels - 1 ? Math.max(levelY, top + topLevelInset) : levelY;
                  const beamTop = y - beamHeight;
                  const tabY = beamTop - (tabHeight - beamHeight) / 2;
                  const leftTabX = beamInnerX - tabWidth * 0.5;
                  const rightTabX = beamInnerX + beamInnerWidth - tabWidth * 0.5;
                  const rivetRadius = Math.max(0.55, Math.min(1.35, tabWidth * 0.12));
                  return (
                    <g key={`tab-${levelIndex}`}>
                      <rect x={leftTabX} y={tabY} width={tabWidth} height={tabHeight} rx={Math.min(2, tabWidth * 0.16)} fill="url(#pickingBeamFinish)" stroke="#b9bec8" strokeWidth={Math.max(0.5, scale * 0.9)} />
                      <rect x={rightTabX} y={tabY} width={tabWidth} height={tabHeight} rx={Math.min(2, tabWidth * 0.16)} fill="url(#pickingBeamFinish)" stroke="#b9bec8" strokeWidth={Math.max(0.5, scale * 0.9)} />
                      {[leftTabX, rightTabX].map((tabX, tabIndex) => (
                        <g key={`connector-${tabIndex}`} fill="#87919e" fillOpacity="0.82">
                          <circle cx={tabX + tabWidth / 2} cy={tabY + tabHeight * 0.3} r={rivetRadius} />
                          <circle cx={tabX + tabWidth / 2} cy={tabY + tabHeight * 0.7} r={rivetRadius} />
                        </g>
                      ))}
                    </g>
                  );
                })}
              </g>
            );
          })}
          <FloorLevelDimension x={rackRight + 5} floorY={bottom} firstLevelY={levelPosition(activeLevels[0])} scale={scale} format={formatMeters} english={english} />
          {activeLevels.slice(0, -1).map((index, gapIndex) => {
            const nextIndex = activeLevels[gapIndex + 1];
            const lowerY = levelPosition(index);
            const nominalUpperY = levelPosition(nextIndex);
            const upperY = nextIndex === levels - 1
              ? Math.max(nominalUpperY, top + topLevelInset)
              : nominalUpperY;
            const lowerBeamTop = lowerY - beamHeight;
            const middleY = (upperY + lowerBeamTop) / 2;
            return (
              <g key={`spacing-${index}`}>
                {lowerBeamTop > upperY && <line x1={rackRight + 5} y1={upperY} x2={rackRight + 5} y2={lowerBeamTop} stroke="#a6a6a6" strokeWidth="1.5" />}
                <line x1={rackRight + 1} y1={upperY} x2={rackRight + 9} y2={upperY} stroke="#a6a6a6" strokeWidth="1.5" />
                {lowerBeamTop > upperY && <line x1={rackRight + 1} y1={lowerBeamTop} x2={rackRight + 9} y2={lowerBeamTop} stroke="#a6a6a6" strokeWidth="1.5" />}
                <text x={rackRight + 16} y={middleY + 6} fill="#666" fontSize="14">{formatMeters(workbench ? Math.max(0, (lowerBeamTop - upperY) / scale) : levelClearance(index, nextIndex, levelSpacing, reinforcedBeams ? 110 : 75))}</text>
              </g>
            );
          })}
          <text x={width - 70} y="460" textAnchor="end" fill="#ff5500" fontSize="15" fontWeight="700">{capacityLabel}</text>
          <g transform="translate(70 470)" fontSize="13" fill="#777">
            <rect width="8" height="8" fill={galvanized ? "url(#pickingFrameMetalFinish)" : "url(#pickingFrameBlueFinish)"} stroke={galvanized ? "#687580" : "none"} /><text x="13" y="8">{english ? "Frame" : "Bastidor"}</text>
            <rect x="92" width="8" height="8" fill="url(#pickingBeamFinish)" stroke="#b9bec8" /><text x="105" y="8">{english ? "Beam" : "Viga"}</text>
            <rect x="155" width="8" height="8" fill={floorType === "Aglomerado" ? "url(#pickingWoodShelfFinish)" : "url(#pickingMetalShelfFinish)"} stroke={floorType === "Aglomerado" ? "#4a3508" : "#687580"} /><text x="168" y="8">{english ? "Shelf" : "Tampo"}</text>
          </g>
          <LevelRemovalTargets activeLevels={activeLevels} yForLevel={(index) => levelPosition(index) - beamHeight / 2} left={rackLeft} right={rackRight} removeLevel={removeLevel} english={english} />
        </svg>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#86868b] sm:text-sm">
        {english ? "Dimensions are shown in the drawing; total length includes the frames." : "Cotas indicam as medidas; o comprimento total inclui os bastidores."}
      </p>
      <SimulatorSolutions solutions={solutions} selectedId={selectedSolutionId} onSelect={onSelectSolution} />
    </div>
  );
}

export default function SimulatorPicking({ onQuoteDataChange, adminMode = false, adminPanel, adminDiscountPercent = null, variant = "picking" }) {
  const workbench = adminMode && variant === "workbench";
  const eligibleFrames = frames.filter((frame) => workbench ? isWorkbenchFrame(frame) : frame.height >= 1000);
  const defaultFrame = eligibleFrames.find((frame) => frame.galvanized && frame.height === (workbench ? 1000 : 2000)) || eligibleFrames[0];
  const allowedHeight = (frame) => workbench ? isWorkbenchFrame(frame) : frame.height >= 1000;
  const [orderOpen, setOrderOpen] = useState(false);
  const orderQuoteRef = useRef(null);
  const drawingRef = useRef(null);
  const { language } = useLanguage();
  const english = language === "en";
  const formatMeters = (value) => `${(value / 1000).toLocaleString(english ? "en-IE" : "pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const formatPrice = (value) => new Intl.NumberFormat(english ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR" }).format(value);
  const [desiredLength, setDesiredLength] = useState("1.00");
  const [rowCount, setRowCount] = useState(1);
  const [sameBeamLength, setSameBeamLength] = useState(false);
  const [desiredBeamLength, setDesiredBeamLength] = useState(beamLengths[0] || 1000);
  const [height, setHeight] = useState(workbench ? defaultFrame?.height || 1000 : 2000);
  const [depth, setDepth] = useState(workbench ? defaultFrame?.depth || 600 : 400);
  const { levels, setLevels, levelSlots, activeLevels, removeLevel, restoreLevels } = useEditableLevels(workbench ? 2 : 4);
  const [floorType, setFloorType] = useState("Aglomerado");
  const [galvanized, setGalvanized] = useState(true);
  const [reinforcedBeams, setReinforcedBeams] = useState(false);
  const [selectedSolutionId, setSelectedSolutionId] = useState("chosen");
  const availableBeamLengths = useMemo(() => unique(beams
    .filter((beam) => beam.produto.includes(reinforcedBeams ? "Viga Z100" : "Viga Z60"))
    .map((beam) => beam.length)), [reinforcedBeams]);
  const enteredLength = Number(desiredLength);
  const isLengthUnavailable = enteredLength > 30;
  const targetLength = enteredLength > 0 ? Math.min(30, enteredLength) * 1000 : 5000;
  const availableHeights = unique(frames.filter((frame) => frame.galvanized === galvanized && allowedHeight(frame)).map((frame) => frame.height));
  const availableDepths = unique(frames.filter((frame) => frame.galvanized === galvanized && allowedHeight(frame)).map((frame) => frame.depth));
  const baseModules = useMemo(
    () => findBestModules(targetLength, { height, depth, levels, floorType, galvanized, reinforcedBeams, sameBeamLength, desiredBeamLength }),
    [targetLength, height, depth, levels, floorType, galvanized, reinforcedBeams, sameBeamLength, desiredBeamLength],
  );

  const matchingFrame = frames.find((frame) => frame.height === height && frame.depth === depth && frame.galvanized === galvanized);
  const estimateModules = (candidate) => {
    const gross = numericPrice(matchingFrame) * (candidate.length + 1) * rowCount + candidate.reduce((sum, moduleLength) => {
    const beamProfile = reinforcedBeams ? "Viga Z100" : "Viga Z60";
    const beam = beams.find((product) => product.length === moduleLength && product.produto.includes(beamProfile));
    const shelf = shelves.find((product) => product.length === moduleLength && product.depth === depth && product.material === floorType);
      return sum + (2 * numericPrice(beam) + numericPrice(shelf) + reinforcementPrice(moduleLength, depth, floorType) + numericPrice(safetyBrake) * 4) * levels * rowCount;
    }, 0);
    const rate = pickingDiscountRate(gross);
    return gross * (1 - rate);
  };
  const solutions = useMemo(() => buildSimilarSolutions(baseModules, targetLength, {
    getModules: (target) => findBestModules(target, { height, depth, levels, floorType, galvanized, reinforcedBeams, sameBeamLength, desiredBeamLength }),
    getTotalLength: (candidate) => candidate.reduce((sum, value) => sum + value, 0) + 50,
    getPrice: estimateModules,
    step: 500,
    maxSteps: 8,
  }), [baseModules, targetLength, height, depth, levels, floorType, galvanized, reinforcedBeams, sameBeamLength, desiredBeamLength, rowCount]);
  const configKey = [desiredLength, rowCount, sameBeamLength, desiredBeamLength, height, depth, levels, floorType, galvanized, reinforcedBeams].join("|");
  useEffect(() => setSelectedSolutionId("chosen"), [configKey]);
  useEffect(() => {
    if (!availableBeamLengths.includes(Number(desiredBeamLength)) && availableBeamLengths.length) {
      setDesiredBeamLength(availableBeamLengths[0]);
    }
  }, [availableBeamLengths, desiredBeamLength]);
  const modules = solutions.find((solution) => solution.id === selectedSolutionId)?.modules ?? baseModules;
  const moduleSubtotal = modules.reduce((sum, moduleLength) => {
    const beamProfile = reinforcedBeams ? "Viga Z100" : "Viga Z60";
    const beam = beams.find((product) => product.length === moduleLength && product.produto.includes(beamProfile));
    const shelf = shelves.find((product) => product.length === moduleLength && product.depth === depth && product.material === floorType);
    const reinforcements = reinforcementPrice(moduleLength, depth, floorType);
    const brakes = numericPrice(safetyBrake) * 4;
    return sum + (2 * numericPrice(beam) + numericPrice(shelf) + reinforcements + brakes) * levels;
  }, 0);
  const estimatePerRow = numericPrice(matchingFrame) * (modules.length + 1) + moduleSubtotal;
  const estimate = estimatePerRow * rowCount;
  const suggestedDiscountRate = pickingDiscountRate(estimate);
  const discountRate = adminMode && adminDiscountPercent !== null
    ? Math.min(100, Math.max(0, Number(adminDiscountPercent) || 0)) / 100
    : suggestedDiscountRate;
  const discountAmount = estimate * discountRate;
  const discountedEstimate = estimate - discountAmount;
  const finalLength = modules.length ? modules.reduce((sum, moduleLength) => sum + moduleLength, 0) + 50 : 0;
  const beamProfile = reinforcedBeams ? "Viga Z100" : "Viga Z60";
  const levelCapacity = modules.length
    ? Math.min(...modules.map((moduleLength) => {
        const beam = beams.find((product) => product.length === moduleLength && product.produto.includes(beamProfile));
        return Number(beam?.produto.match(/suporta\s*(\d+)\s*(?:Kg|g)/i)?.[1]) || 0;
      }))
    : 0;
  const beamDistribution = [...new Set(modules)].sort((a, b) => a - b).map((length) => ({
    length,
    count: modules.filter((moduleLength) => moduleLength === length).length * levels * 2 * rowCount,
  }));
  const shelfDistribution = [...new Set(modules)].sort((a, b) => a - b).map((length) => ({
    length,
    count: modules.filter((moduleLength) => moduleLength === length).length * levels * rowCount,
  }));
  useEffect(() => {
    const profile = reinforcedBeams ? "Viga Z100" : "Viga Z60";
    const entries = [
      { product: matchingFrame, quantity: (modules.length + 1) * rowCount },
      ...[...new Set(modules)].flatMap((length) => {
        const moduleCount = modules.filter((moduleLength) => moduleLength === length).length * levels * rowCount;
        const centralCount = length <= 2000 ? 1 : 2;
        return [
          { product: beams.find((item) => item.length === length && item.produto.includes(profile)), quantity: moduleCount * 2 },
          { product: shelves.find((item) => item.length === length && item.depth === depth && item.material === floorType), quantity: moduleCount },
          { product: reinforcementProduct("central", depth, floorType), quantity: moduleCount * centralCount },
          { product: reinforcementProduct("lateral", depth, floorType), quantity: moduleCount * 2 },
        ];
      }),
      { product: safetyBrake, quantity: modules.length * levels * 4 * rowCount },
    ];
    const format = (value) => (value / 1000).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const quote = {
      items: createQuoteLines(entries, 3),
      discountPercent: discountRate * 100,
      total: discountedEstimate,
      details: `${workbench ? "Bancadas" : "Estantes picking"} · Comprimento por fila: ${format(finalLength)} m · Comprimento total: ${format(finalLength * rowCount)} m · Altura: ${format(height)} m · Profundidade: ${format(depth)} m · Níveis: ${levels} (posições mantidas, de baixo para cima: ${activeLevels.map((index) => index + 1).join(", ")} de ${levelSlots}) · Linhas de estantes lado a lado: ${rowCount} · Piso: ${floorType} · Bastidores: ${galvanized ? "galvanizados" : "pintados"} · Vigas: ${profile} · Carga máxima por par de vigas: ${levelCapacity.toLocaleString("pt-PT")} kg`,
      unavailable: isLengthUnavailable || !matchingFrame || modules.length === 0,
    };
    orderQuoteRef.current = quote;
    onQuoteDataChange?.(quote);
  }, [activeLevels.join(","), levelSlots, workbench, onQuoteDataChange, matchingFrame, modules, levels, rowCount, depth, floorType, safetyBrake, reinforcedBeams, galvanized, discountRate, discountedEstimate, finalLength, height, levelCapacity, isLengthUnavailable]);

  function hasPricedShelf(shelfDepth, material) {
    return shelves.some((shelf) => shelf.depth === shelfDepth && shelf.material === material && typeof shelf["preço"] === "number");
  }

  function handleHeightChange(nextHeight) {
    const validDepths = unique(frames.filter((frame) => frame.height === nextHeight && frame.galvanized === galvanized).map((frame) => frame.depth));
    const nextDepth = validDepths.find((candidate) => hasPricedShelf(candidate, floorType)) ?? validDepths.find((candidate) => hasPricedShelf(candidate, floorType === "Aglomerado" ? "Metálica" : "Aglomerado")) ?? validDepths[0];
    setHeight(nextHeight);
    setDepth(nextDepth);
    if (!hasPricedShelf(nextDepth, floorType)) setFloorType(floorType === "Aglomerado" ? "Metálica" : "Aglomerado");
  }

  function handleDepthChange(nextDepth) {
    const compatibleFrames = frames.filter((frame) => frame.depth === nextDepth && frame.galvanized === galvanized && allowedHeight(frame));
    const nextHeight = compatibleFrames.find((frame) => frame.height === height && hasPricedShelf(nextDepth, floorType))?.height
      ?? compatibleFrames.find((frame) => hasPricedShelf(nextDepth, floorType))?.height
      ?? compatibleFrames[0]?.height;
    setDepth(nextDepth);
    if (nextHeight !== undefined) setHeight(nextHeight);
    if (!hasPricedShelf(nextDepth, floorType)) setFloorType(floorType === "Aglomerado" ? "Metálica" : "Aglomerado");
  }

  function handleFloorTypeChange(nextFloorType) {
    if (!hasPricedShelf(depth, nextFloorType)) {
      const nextDepth = availableDepths.find((candidate) => hasPricedShelf(candidate, nextFloorType));
      if (nextDepth !== undefined) setDepth(nextDepth);
    }
    setFloorType(nextFloorType);
  }

  function handleGalvanizedChange(nextGalvanized) {
    const eligibleFrames = frames.filter((frame) => frame.galvanized === nextGalvanized && allowedHeight(frame));
    const match = eligibleFrames.find((frame) => frame.height === height && frame.depth === depth && hasPricedShelf(frame.depth, floorType))
      ?? eligibleFrames.find((frame) => hasPricedShelf(frame.depth, floorType))
      ?? eligibleFrames[0];
    if (!match) return;
    setGalvanized(nextGalvanized);
    setHeight(match.height);
    setDepth(match.depth);
    if (!hasPricedShelf(match.depth, floorType)) setFloorType(floorType === "Aglomerado" ? "Metálica" : "Aglomerado");
  }

  function reset() {
    setDesiredLength("1.00");
    setRowCount(1);
    setSameBeamLength(false);
    setDesiredBeamLength(availableBeamLengths[0] || beamLengths[0] || 1000);
    setHeight(workbench ? defaultFrame?.height || 1000 : 2000);
    setDepth(workbench ? defaultFrame?.depth || 600 : 400);
    setLevels(workbench ? 2 : 4);
    setFloorType("Aglomerado");
    setGalvanized(true);
    setReinforcedBeams(false);
  }

  return (
    <section ref={drawingRef} className={adminMode ? "min-h-0 bg-transparent p-0" : "min-h-screen bg-[#f8f8fa] px-4 py-12 sm:px-6 lg:px-10 lg:py-16"}>
      {!adminMode && <header className="mx-auto mb-9 max-w-[1800px] sm:mb-12">
        <p className="mt-[35px] mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73] lg:mt-5">{english ? "Configurator · Picking shelving" : "Configurador · Estantes picking"}</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">{english ? "Shelving made for your space." : "A sua estante, à medida do seu espaço."}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">{english ? "Choose the dimensions and materials. See the configuration, load capacity and price estimate update in real time." : "Defina as medidas e os materiais. Veja a configuração, a capacidade e uma estimativa de preço atualizadas em tempo real."}</p>
      </header>}
      {!adminMode && <div className="mx-auto grid max-w-[1800px] gap-5 lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.75fr)] xl:gap-7">
        <div className="flex justify-start"><SimulatorSectionTabs group="storage" active="picking" /></div>
        <div className="hidden lg:block" aria-hidden="true" />
      </div>}
      <>
      <div className={`mx-auto grid max-w-[1800px] items-start gap-5 lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.75fr)] xl:gap-7 ${adminMode ? "lg:gap-4 xl:gap-5" : ""}`}>
        <div className="site-glass relative z-20 order-2 w-full rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 lg:order-1 lg:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "1 · Configuration" : "1 · Configuração"}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#1d1d1f]">{english ? "Choose dimensions" : "Escolha as medidas"}</h2>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <label className="block min-w-0 space-y-2 sm:col-span-2">
              <span className="block text-sm font-semibold text-[#424245]">{english ? "Total desired length (m)" : "Comprimento total pretendido (m)"}</span>
              <span className="block text-xs leading-relaxed text-[#86868b]">{english ? "Enter the metres of shelving in a straight line for one row." : "Indique os metros de estantes em linha reta para uma fila."}</span>
              <div className="flex items-center simulator-pill rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-5 transition focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/10">
                <input
                  type="text"
                  inputMode="decimal"
                  value={desiredLength}
                  onClick={(event) => event.currentTarget.select()}
                  onChange={(event) => setDesiredLength(event.target.value.slice(0, 6))}
                  onBlur={() => {
                    const value = Number(desiredLength);
                    if (value > 0) setDesiredLength(value.toFixed(2));
                  }}
                  className="w-full bg-transparent py-3.5 text-[15px] font-medium text-[#1d1d1f] outline-none"
                  aria-label={english ? "Total desired length in metres" : "Comprimento total pretendido em metros"}
                />
                <span className="text-sm font-medium text-[#86868b]">m</span>
              </div>
              {isLengthUnavailable ? (
                <span className="mt-1 block text-sm font-medium text-red-600">{english ? "Lengths over 30.00 m are not available." : "Comprimentos superiores a 30,00 m não estão disponíveis."}</span>
              ) : null}
            </label>
            <SimulatorDropdown label={english ? "Frame height (m)" : "Altura do bastidor (m)"} value={height} onChange={handleHeightChange} options={availableHeights.length ? availableHeights : workbench ? [] : heights} format={formatMeters} />
            <SimulatorDropdown label={english ? "Depth (m)" : "Profundidade (m)"} value={depth} onChange={handleDepthChange} options={availableDepths.length ? availableDepths : depths} format={formatMeters} />
            <SimulatorDropdown label={english ? "Number of levels" : "N.º de níveis"} value={levels} onChange={setLevels} options={workbench ? [1, 2] : levelOptions} />
            <SimulatorDropdown label={english ? "Shelf material" : "Tipo de piso"} value={floorType} onChange={handleFloorTypeChange} options={["Aglomerado", "Metálica"]} format={(value) => english ? (value === "Aglomerado" ? "Chipboard" : "Metal") : value} />
            <SimulatorConfigurationOptions
              rowCount={rowCount}
              onRowCountChange={setRowCount}
              sameBeamLength={sameBeamLength}
              onSameBeamLengthChange={setSameBeamLength}
              desiredBeamLength={desiredBeamLength}
              onDesiredBeamLengthChange={setDesiredBeamLength}
              sameLengthToggleLabel={english ? "Beams of the same length" : "Vigas do mesmo comprimento"}
              sameLengthSelectLabel={english ? "Available beam length (m)" : "Medida disponível das vigas (m)"}
              sameLengthOptions={availableBeamLengths}
              sameLengthFormat={formatMeters}
              automaticLengthMessage={english ? "When this option is off, the calculation can combine beams of different lengths to get close to the requested length." : "Com esta opção desligada, o cálculo pode combinar vigas de diferentes comprimentos para aproximar o comprimento pedido."}
            />
            <label className="flex min-w-0 cursor-pointer items-center gap-3 simulator-pill rounded-full border border-[#e5e5e7] bg-[#fbfbfd] px-4 py-3 text-sm font-medium text-[#424245] transition hover:border-[#c7c7cc]">
              <input type="checkbox" checked={galvanized} onChange={(event) => handleGalvanizedChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-[#0071e3]" />
              <span>{english ? "Galvanised frames" : "Bastidores galvanizados"}</span>
            </label>
            <label className="flex min-w-0 cursor-pointer items-center gap-3 simulator-pill rounded-full border border-[#e5e5e7] bg-[#fbfbfd] px-4 py-3 text-sm font-medium text-[#424245] transition hover:border-[#c7c7cc]">
              <input type="checkbox" checked={reinforcedBeams} onChange={(event) => setReinforcedBeams(event.target.checked)} className="h-4 w-4 shrink-0 accent-[#0071e3]" />
              <span>{english ? "Reinforced beams (Z100)" : "Vigas reforçadas (Z100)"}</span>
            </label>
          </div>
          <div className="mt-7 border-t border-[#e5e5e7] pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">{english ? "Price estimate" : "Estimativa de preço"}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-4xl font-semibold tracking-[-0.04em] text-(--orange)">{isLengthUnavailable ? (english ? "Unavailable" : "Indisponível") : formatPrice(discountedEstimate)}</p>
              {!isLengthUnavailable && <span className="text-sm font-medium text-[#86868b]">{english ? "+ VAT" : "+ IVA"}</span>}
            </div>
            <p className="mt-1 text-sm text-[#6e6e73]">{english ? `Total price for ${rowCount} shelving line${rowCount === 1 ? "" : "s"} placed side by side.` : `Preço total para ${rowCount} ${rowCount === 1 ? "linha de estantes" : "linhas de estantes"} lado a lado.`}</p>
            {discountRate > 0 && !isLengthUnavailable && (
              <p className="mt-2 text-sm font-semibold text-[#0879C0]">{english ? `${discountRate * 100}% discount applied: −${formatPrice(discountAmount)}` : `Desconto de ${discountRate * 100}% aplicado: −${formatPrice(discountAmount)}`}</p>
            )}
            {!isLengthUnavailable && (
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[30px] bg-[#f5f5f7] p-5 text-sm">
                <p className="col-span-2 flex items-baseline justify-between gap-2 border-b border-[#e5e5e7] pb-2"><span className="text-[#6e6e73]">{english ? "Total row length" : "Comprimento total das filas"}</span><strong className="font-semibold text-[#1d1d1f]">{formatMeters(finalLength * rowCount)}</strong></p>
                <p><span className="block text-xs text-[#86868b]">{english ? "Length per row" : "Comprimento por fila"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(finalLength)}</strong></p>
                <p><span className="block text-xs text-[#86868b]">{english ? "Height" : "Altura"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(height)}</strong></p>
                <p><span className="block text-xs text-[#86868b]">{english ? "Depth" : "Profundidade"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{formatMeters(depth)}</strong></p>
                <p><span className="block text-xs text-[#86868b]">{english ? "Levels · Shelf" : "Níveis · Piso"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{levels} · {english ? (floorType === "Aglomerado" ? "Chipboard" : "Metal") : floorType}</strong></p>
                <p><span className="block text-xs text-[#86868b]">{english ? "Frame · Beams" : "Estrutura · Vigas"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{galvanized ? (english ? "Galvanised" : "Galvanizada") : (english ? "Painted" : "Pintada")} · {beamProfile}</strong></p>
                <p><span className="block text-xs text-[#86868b]">{english ? "Identical rows" : "Filas iguais"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{rowCount}</strong></p>
                <p className="col-span-2"><span className="block text-xs text-[#86868b]">{english ? "Beams by length" : "Vigas por medida"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{beamDistribution.map(({ length, count }) => `${count} × ${formatMeters(length)}`).join(" · ")}</strong></p>
                <p className="col-span-2"><span className="block text-xs text-[#86868b]">{english ? "Shelves by length" : "Tampos por medida"}</span><strong className="mt-0.5 block font-semibold text-[#1d1d1f]">{shelfDistribution.map(({ length, count }) => `${count} × ${formatMeters(length)}`).join(" · ")}</strong></p>
                <p className="col-span-2 border-t border-[#e5e5e7] pt-2 text-[#6e6e73]">{english ? "Maximum load per beam pair" : "Carga máxima por par de vigas"} <strong className="font-semibold text-(--orange)">{levelCapacity.toLocaleString(english ? "en-IE" : "pt-PT")} kg</strong></p>
              </div>
            )}
            <div className={`mt-5 grid gap-3 ${adminMode ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
              {!adminMode && <button type="button" disabled={isLengthUnavailable} onClick={() => setOrderOpen(true)} className="flex cursor-pointer items-center justify-center simulator-pill rounded-full bg-(--orange) px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">{english ? "Order" : "Encomendar"}</button>}
              <button type="button" onClick={reset} className="cursor-pointer simulator-pill rounded-full border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]">{adminMode ? (english ? "Reset configuration" : "Repor configuração") : (english ? "Reset" : "Recomeçar")}</button>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#86868b]">{english ? "VAT is added at the applicable rate. Delivery is not included. Configuration is subject to technical validation." : "Ao valor acresce IVA à taxa legal. Transporte não incluído. Configuração sujeita a validação técnica."}</p>
          {!matchingFrame && <p className="mt-3 rounded-[30px] bg-amber-50 p-3 text-sm text-amber-800">{english ? "No frame with this height, depth and finish combination is available in catalogue ref. 3." : "Não existe um bastidor com esta combinação de altura, profundidade e acabamento no catálogo ref. 3."}</p>}
        </div>
        <div className="order-1 min-w-0 space-y-4 lg:order-2">
        {isLengthUnavailable ? (
          <div className="site-glass flex-1 rounded-[30px] border border-[#e5e5e7] bg-white p-7 shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
            <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">{workbench ? (english ? "Workbench" : "Bancada") : (english ? "Picking shelving" : "Estante de picking")}</h2><p className="mt-1 text-xs text-[#86868b]">{english ? "Your configuration · 2D preview" : "A sua configuração · Pré-visualização 2D"}</p>
            <p className="mt-4 rounded-[30px] bg-red-50 p-4 text-sm text-red-700">{english ? "Lengths over 30.00 m are not available." : "Comprimentos superiores a 30,00 m não estão disponíveis."}</p>
          </div>
        ) : (
          <div className="order-1 min-w-0 lg:order-2">
            <RackPreview workbench={workbench} modules={modules} height={height} depth={depth} levels={levelSlots} activeLevels={activeLevels} removeLevel={removeLevel} restoreLevels={restoreLevels} floorType={floorType} galvanized={galvanized} reinforcedBeams={reinforcedBeams} rowCount={rowCount} capacityLabel={`${english ? "Maximum load per beam pair" : "Carga máxima por par de vigas"}: ${levelCapacity.toLocaleString(english ? "en-IE" : "pt-PT")} kg`} solutions={solutions} selectedSolutionId={selectedSolutionId} onSelectSolution={setSelectedSolutionId} english={english} />
          </div>
        )}
          {adminMode && adminPanel}
        </div>
      </div>
      </>
      {!adminMode && <SimulatorOrderModal open={orderOpen} onClose={() => setOrderOpen(false)} total={orderQuoteRef.current?.total ?? discountedEstimate} details={orderQuoteRef.current?.details} items={orderQuoteRef.current?.items} discountPercent={orderQuoteRef.current?.discountPercent ?? discountRate * 100} drawingRef={drawingRef} english={english} />}
    </section>
  );
}
