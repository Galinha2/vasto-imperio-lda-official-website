"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IoGridOutline, IoDownloadOutline } from "react-icons/io5";
import SimulatorOrderModal from "./SimulatorOrderModal";
import createQuoteLines from "./createQuoteLines";
import budget from "@/assets/orcamento.json";
import SimulatorDropdown from "./SimulatorDropdown";
import SpacePlannerButton from "./SpacePlannerButton";
import SpacePlannerBay, { SpacePlannerDrawingDefs } from "./SpacePlannerBay";
import { editSpacePlan, shelfKey, sharesStartFrame } from "@/lib/space-plan-editing.mjs";
import { estimateSpacePlan } from "@/lib/space-catalog.mjs";
import { pickingDiscountRate } from "@/lib/picking-discount.mjs";
import { planSpace } from "@/lib/space-planner.mjs";

const money = (n) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
const meters = (n) => Number(n).toLocaleString("pt-PT", { maximumFractionDigits: 2 });
const walls = { top: "Parede de cima", right: "Parede direita", bottom: "Parede de baixo", left: "Parede esquerda" };
const control = "mt-2 h-11 w-full rounded-full border border-[#e5e5e7] bg-[#fbfbfd] px-4 text-sm text-[#1d1d1f] outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-100";

export default function SpacePlanner({ models, initialType, onClose, onTypeChange, embedded = false }) {
  const [form, setForm] = useState({ width: "3", length: "5", height: initialType === "racks" ? "6" : "3", depth: String(initialType === "racks" ? models.find((m) => m.type === "racks")?.depth || 1.1 : 0.6), aisle: initialType === "racks" ? "3.5" : "1", doorWall: "bottom", doorOffset: "1.4", doorWidth: "1.2", center: false, levels: "4", optimization: "economico", material: "Aglomerado" });
  const [type, setType] = useState(initialType || "picking");
  const drawingRef = useRef(null);
  const orderQuoteRef = useRef(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [excludedWalls, setExcludedWalls] = useState([]);
  const [removedByPlan, setRemovedByPlan] = useState({});
  const [selectedShelf, setSelectedShelf] = useState(null);
  const update = (key, value) => { setForm((old) => ({ ...old, [key]: value })); setSelected(0); setRemovedByPlan({}); setSelectedShelf(null); };
  function changeType(next) {
    const depths = models.filter((m) => m.type === next).map((m) => m.depth);
    const currentDepth = Number(form.depth);
    setForm((old) => ({ ...old, depth: String(depths.includes(currentDepth) ? currentDepth : depths.includes(0.6) ? 0.6 : Math.min(...depths)), aisle: next === "racks" ? String(Math.max(3.5, Number(old.aisle) || 0)) : type === "racks" && Number(old.aisle) === 3.5 ? "1" : old.aisle, levels: next !== "racks" && Number(old.levels) < 2 ? "2" : old.levels }));
    setType(next); onTypeChange?.(next); setSelected(0); setRemovedByPlan({}); setSelectedShelf(null);
  }
  const depths = [...new Set(models.filter((m) => m.type === type).map((m) => m.depth))].sort((a, b) => a - b);
  const config = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, ["doorWall", "center", "material", "optimization"].includes(k) ? v : Number(String(v).replace(",", "."))]));
  const result = useMemo(() => {
    const catalog = models.filter((m) => m.type === type && (!m.material || m.material === form.material));
    const main = planSpace(config, catalog);
    if (main.error) return main;
    const alternatives = form.center ? [...main.plans, ...planSpace({ ...config, center: false }, catalog).plans] : main.plans;
    const usable = alternatives.filter((p) => p.shelves.length).map((p) => ({ ...p, estimate: p.estimate || estimateSpacePlan(p, catalog, Number(form.levels), form.material) }));
    const maxLength = Math.max(0, ...usable.map((p) => p.runLength));
    const plans = (form.optimization === "economico" ? usable.filter((p) => p.runLength + 1e-7 >= maxLength * 0.95) : usable).sort((a, b) => form.optimization === "economico" ? (a.estimate?.subtotal ?? Infinity) - (b.estimate?.subtotal ?? Infinity) || b.runLength - a.runLength : b.runLength - a.runLength);
    const unique = plans.filter((p, index) => plans.findIndex((other) => JSON.stringify(other.shelves.map(({ x, y, w, h }) => [x, y, w, h].map((n) => Math.round(n * 1000))).sort()) === JSON.stringify(p.shelves.map(({ x, y, w, h }) => [x, y, w, h].map((n) => Math.round(n * 1000))).sort())) === index);
    return { plans: unique.slice(0, 3), error: unique.length ? "" : "Não cabe uma disposição com estas folgas. Experimente menor profundidade, outra posição da porta ou um espaço maior." };
  }, [JSON.stringify(form), type, models]);
  const editablePlans = result.plans.map((p) => editSpacePlan(p, removedByPlan[p.id] || [], excludedWalls));
  const originalPlan = result.plans[selected] || result.plans[0];
  const plan = editablePlans[selected] || editablePlans[0];
  const selectedModule = plan?.shelves.find((shelf) => shelfKey(shelf) === selectedShelf);
  function removeSelectedShelf() {
    if (!selectedModule || !originalPlan) return;
    setRemovedByPlan((old) => ({ ...old, [originalPlan.id]: [...(old[originalPlan.id] || []), selectedShelf] }));
    setSelectedShelf(null);
  }
  function toggleWall(wall) {
    setExcludedWalls((old) => old.includes(wall) ? old.filter((item) => item !== wall) : [...old, wall]);
    setSelectedShelf(null);
  }
  const estimate = plan ? estimateSpacePlan(plan, models.filter((m) => m.type === type), Number(form.levels), form.material) : null;
  const discountRate = type === "picking" ? pickingDiscountRate(estimate?.subtotal || 0) : 0;
  const discountedTotal = (estimate?.subtotal || 0) * (1 - discountRate);
  const validLevels = Number.isInteger(Number(form.levels)) && Number(form.levels) >= (type === "racks" ? 1 : 2) && Number(form.levels) <= 11;
  const scale = 560 / Math.max(config.width || 1, config.length || 1);
  const W = config.width * scale, H = config.length * scale;
  const pad = 65;
  const field = (key, label, min, max, step = "0.1") => <label className="block text-sm font-semibold text-[#424245]">{label}<input type="number" min={min} max={max} step={step} value={form[key]} onChange={(e) => update(key, e.target.value)} className={control} /></label>;

  function orderSpace() {
    if (!estimate || !validLevels || !plan?.shelves.length) return;
    const family = type === "ligeiras" ? 1 : type === "picking" ? 3 : 2;
    const entries = estimate.parts.filter((part) => part.quantity > 0).map((part) => ({ product: budget.produtos.find((product) => product.ref === family && product.produto === part.name && product["preço"] === part.price), quantity: part.quantity }));
    if (entries.some((entry) => !entry.product)) return;
    const items = createQuoteLines(entries, family);
    orderQuoteRef.current = {
      total: discountedTotal, items, discountPercent: discountRate * 100,
      details: `Planeamento de espaço · ${type} · Sala: ${meters(config.width)} × ${meters(config.length)} m · Altura disponível: ${meters(config.height)} m · Porta: ${walls[form.doorWall]}, ${meters(config.doorWidth)} m de largura, a ${meters(config.doorOffset)} m do canto · ${plan.shelves.length} módulos · ${form.levels} níveis · Tampo: ${type === "picking" ? form.material : type === "racks" ? "Sem tampo" : "Metálico"} · Altura das estantes: ${meters(plan.height)} m · Profundidade: ${meters(config.depth)} m.\n${plan.shelves.map((shelf, index) => `Módulo ${index + 1}: posição (${meters(shelf.x)}; ${meters(shelf.y)}) m, ${meters(shelf.w)} × ${meters(shelf.h)} m`).join("\n")}`,
    };
    setOrderOpen(true);
  }

  function download() {
    const svg = document.getElementById("space-planner-drawing");
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "planta-estantes-vasto-imperio.svg"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section ref={drawingRef} className={embedded ? "min-w-0" : "bg-[#f8f8fa] px-4 py-8 sm:px-8"}>
      <div className="mx-auto max-w-[1800px] pt-20">

        {!embedded && <header className="mb-8 mt-6 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ea580c]">Simulador · Medidas do espaço</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Estantes à medida do seu espaço.</h2>
          <p className="mt-4 text-base leading-relaxed text-[#6e6e73]">Indique as medidas e a porta. Compare sugestões de estantes numa planta, com entrada livre e aproveitamento dos cantos.</p>
        </header>}
        <SpacePlannerButton type={type} activeView="space" />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.75fr)]">
          <aside className="space-y-6 rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 lg:p-8">
            <section><h2 className="text-lg font-semibold tracking-tight">1 · O espaço disponível</h2><p className="mt-1 text-xs leading-relaxed text-[#86868b]">Sala retangular: por exemplo, 4 × 8 m tem paredes de 4, 8, 4 e 8 m. Todas as medidas são em metros.</p><div className="mt-4 grid grid-cols-2 gap-4">{field("width", "Largura (m)", 1, 30)}{field("length", "Comprimento (m)", 1, 30)}{field("height", "Altura até ao teto (m)", 1, 12)}</div></section>
            <section className="border-t border-[#f0f0f2] pt-5"><h2 className="text-lg font-semibold tracking-tight">2 · Onde fica a porta?</h2><div className="mt-3"><SimulatorDropdown label="Parede da porta" value={form.doorWall} onChange={(value) => update("doorWall", value)} options={Object.keys(walls)} format={(value) => walls[value]} /></div><div className="mt-4 grid grid-cols-2 gap-4">{field("doorWidth", "Largura da porta (m)", 0.5, 10)}{field("doorOffset", "Distância ao canto (m)", 0, 30)}</div><p className="mt-2 text-[11px] leading-relaxed text-[#86868b]">Distância desde o canto esquerdo nas paredes horizontais, ou desde o canto superior nas verticais. A zona tracejada reserva 1,5 m livres à frente da porta (ou todo o comprimento disponível, se for inferior). Os cantos podem receber estantes a 90°, mesmo que o acesso a alguns módulos fique condicionado. Os corredores escolhidos são mantidos entre filas centrais.</p></section>
            <section className="border-t border-[#f0f0f2] pt-5"><h2 className="text-lg font-semibold tracking-tight">3 · Como quer arrumar?</h2><div className="mt-3"><SimulatorDropdown label="Tipo de estante" value={type} onChange={changeType} options={["ligeiras", "picking", "racks"]} format={(value) => ({ ligeiras: "Estantes ligeiras", picking: "Estantes de picking", racks: "Racks para paletes" }[value])} /></div><div className="mt-4 grid grid-cols-2 gap-4"><SimulatorDropdown label="Profundidade (m)" value={Number(form.depth)} onChange={(value) => update("depth", String(value))} options={depths} format={(value) => `${meters(value)} m`} />{field("aisle", "Corredor livre (m)", 0.8, 5)}</div><div className="mt-4"><SimulatorDropdown label="Prioridade da proposta" value={form.optimization} onChange={(value) => update("optimization", value)} options={["economico", "capacidade"]} format={(value) => value === "economico" ? "Mais económico" : "Máximo aproveitamento"} /></div><p className="mt-2 text-[11px] leading-relaxed text-[#86868b]">No modo económico, comparamos o preço das combinações avaliadas, aceitando até 5% menos comprimento de estantes. Os níveis, a altura sugerida e o material são mantidos.</p><div className="mt-4 grid grid-cols-2 gap-4"><SimulatorDropdown label="Níveis por módulo" value={Number(form.levels)} onChange={(value) => update("levels", String(value))} options={Array.from({ length: type === "racks" ? 11 : 10 }, (_, index) => index + (type === "racks" ? 1 : 2))} />{type === "picking" && <SimulatorDropdown label="Tipo de tampo" value={form.material} onChange={(value) => update("material", value)} options={["Aglomerado", "Metálica"]} />}</div><label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#fff7ed] p-4"><input type="checkbox" checked={form.center} onChange={(e) => update("center", e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#ea580c]" /><span><span className="block text-sm font-semibold text-[#1d1d1f]">Aproveitar o espaço central</span><span className="mt-1 block text-xs leading-relaxed text-[#6e6e73]">Testar filas duplas, costas com costas, mantendo os corredores.</span></span></label></section>
            <section className="border-t border-[#f0f0f2] pt-5"><h2 className="text-lg font-semibold tracking-tight">4 · Paredes a utilizar</h2><p className="mt-2 text-xs leading-relaxed text-[#86868b]">Desmarque uma parede para retirar todas as estantes dessa parede. Pode voltar a ativá-la.</p><div className="mt-3 grid grid-cols-2 gap-3">{Object.entries(walls).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 text-xs text-[#6e6e73]"><input type="checkbox" checked={!excludedWalls.includes(key)} onChange={() => toggleWall(key)} className="h-4 w-4 accent-[#ea580c]" />{label}</label>)}</div></section>
          </aside>
          <div className="min-w-0 space-y-5">
            {result.error ? <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{result.error}</div> : <>
              <section className="rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7 md:p-9">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">Visualização · Planta 2D</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{meters(config.width)} × {meters(config.length)} m</h2></div><button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-full border border-[#e5e5e7] px-4 py-2 text-xs text-[#6e6e73] hover:bg-[#f5f5f7]"><IoDownloadOutline />Guardar planta</button></div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f5f5f7] p-4">
                  <div><p className="text-xs font-semibold text-[#1d1d1f]">{selectedModule ? `Estante ${plan.shelves.indexOf(selectedModule) + 1} selecionada` : "Personalize a sua planta"}</p><p className="mt-1 text-[11px] text-[#6e6e73]">{selectedModule ? `${meters(selectedModule.runWidth)} m de comprimento · ${meters(selectedModule.depth)} m de profundidade` : "Clique numa estante no desenho para a remover. O preço atualiza automaticamente."}</p></div>
                  <div className="flex flex-wrap gap-2">{selectedModule && <button type="button" onClick={removeSelectedShelf} className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Remover esta estante</button>}{(removedByPlan[originalPlan.id]?.length > 0 || excludedWalls.length > 0) && <button type="button" onClick={() => { setRemovedByPlan({}); setExcludedWalls([]); setSelectedShelf(null); }} className="rounded-full border border-[#e5e5e7] bg-white px-4 py-2 text-xs font-medium text-[#6e6e73] hover:bg-[#edf3f8]">Repor todas as estantes</button>}</div>
                </div>
                <svg data-order-drawing="true" id="space-planner-drawing" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W + pad * 2} ${H + pad * 2}`} role="group" aria-label={`Planta de ${meters(config.width)} por ${meters(config.length)} metros com ${plan.shelves.length} módulos de estantes e porta na ${walls[form.doorWall].toLowerCase()}`} className="mx-auto mt-5 max-h-[650px] w-full">
                  <SpacePlannerDrawingDefs />
                  <rect width={W + pad * 2} height={H + pad * 2} fill="white" />
                  <g transform={`translate(${pad},${pad})`}>
                    <rect width={W} height={H} fill="url(#space-floor-grid)" stroke="#b5bfc8" strokeWidth="4" />
                    {plan.reserved.map((r, i) => <rect key={i} x={r.x * scale} y={r.y * scale} width={r.w * scale} height={r.h * scale} fill="#e5f4ef" fillOpacity="0.8" stroke="#8ec5b0" strokeWidth="1" strokeDasharray="5 4" />)}
                    {plan.shelves.map((r, i) => <g key={shelfKey(r)} role="button" tabIndex={0} aria-label={`Selecionar estante ${i + 1}, ${meters(r.runWidth)} metros`} aria-pressed={selectedShelf === shelfKey(r)} onClick={() => setSelectedShelf((old) => old === shelfKey(r) ? null : shelfKey(r))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedShelf((old) => old === shelfKey(r) ? null : shelfKey(r)); } }} className="cursor-pointer focus:outline-none focus:[&>rect]:stroke-[#ff5500] focus:[&>rect]:stroke-[3px]"><title>{`Módulo ${i + 1}: ${meters(Math.max(r.w, r.h))} × ${meters(Math.min(r.w, r.h))} m · altura ${meters(r.height)} m`}</title><rect x={r.x * scale} y={r.y * scale} width={r.w * scale} height={r.h * scale} fill="transparent" /><SpacePlannerBay sharedStart={sharesStartFrame(r, plan.shelves)} shelf={r} scale={scale} type={type} material={form.material} index={i} selected={selectedShelf === shelfKey(r)} /></g>)}
                    {(() => { const horizontal = ["top", "bottom"].includes(form.doorWall); const x = horizontal ? config.doorOffset * scale : form.doorWall === "left" ? 0 : W; const y = horizontal ? form.doorWall === "top" ? 0 : H : config.doorOffset * scale; return <g><line x1={x} y1={y} x2={horizontal ? x + config.doorWidth * scale : x} y2={horizontal ? y : y + config.doorWidth * scale} stroke="#fafbfd" strokeWidth="9" /><line x1={x} y1={y} x2={horizontal ? x + config.doorWidth * scale : x} y2={horizontal ? y : y + config.doorWidth * scale} stroke="#248865" strokeWidth="4" /><text x={horizontal ? x + config.doorWidth * scale / 2 : x + (form.doorWall === "left" ? -10 : 10)} y={horizontal ? y + (form.doorWall === "top" ? -12 : 23) : y + config.doorWidth * scale / 2} textAnchor={horizontal ? "middle" : form.doorWall === "left" ? "end" : "start"} fontSize="11" fontFamily="Arial, sans-serif" fill="#187653">Porta</text></g>; })()}
                    <text x={W / 2} y="-32" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fill="#536579">{meters(config.width)} m</text><text x="-38" y={H / 2} textAnchor="middle" transform={`rotate(-90 -38 ${H / 2})`} fontFamily="Arial, sans-serif" fontSize="14" fill="#536579">{meters(config.length)} m</text>
                  </g>
                </svg>
                <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-[#6e6e73]"><span className="inline-flex items-center gap-2"><i className="h-2 w-4 rounded-sm bg-[#9cabb6]" />Bastidores e vigas</span><span className="inline-flex items-center gap-2"><i className={`h-2 w-4 rounded-sm ${type === "picking" && form.material === "Aglomerado" ? "bg-[#d5b888]" : "bg-[#dce3e9]"}`} />{type === "racks" ? "Estrutura aberta para paletes" : type === "picking" && form.material === "Aglomerado" ? "Tampo em aglomerado" : "Tampo metálico"}</span><span className="inline-flex items-center gap-2"><i className="h-2 w-4 rounded-sm border border-dashed border-[#8ec5b0] bg-[#e5f4ef]" />Passagem reservada</span></div>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#f0f0f2] pt-4 sm:grid-cols-4">{[["Módulos", plan.shelves.length], ["Comprimento de estantes", `${meters(plan.runLength)} m`], ["Altura sugerida", `${meters(plan.height)} m`], ["Área ocupada", `${meters(plan.area)} m²`]].map(([label, value]) => <div key={label}><p className="text-[10px] text-[#86868b]">{label}</p><p className="mt-1 text-lg font-semibold tracking-tight">{value}</p></div>)}</div>
                {plan.cornerAccessRestricted && <p className="mt-4 text-xs leading-relaxed text-[#6e6e73]">Esta proposta aproveita os cantos a 90° e pode limitar o acesso frontal a alguns módulos. Mantém a zona livre de 1,5 m à frente da porta.</p>}
                {plan.shelves.length === 0 && <p role="status" className="mt-4 text-xs text-[#6e6e73]">Retirou todas as estantes desta proposta. Ative uma parede ou escolha “Repor todas as estantes” para recuperar o desenho.</p>}
                {form.center && !plan.centralCount && <p className="mt-4 text-xs text-[#6e6e73]">Nesta disposição não cabem filas centrais sem reduzir as passagens escolhidas.</p>}
              </section>
              <section aria-label="Soluções para o espaço"><h2 className="mb-3 text-sm font-semibold text-[#1d1d1f]">Compare as soluções</h2>
              <div className="grid gap-3 md:grid-cols-3">{editablePlans.map((p, index) => <button type="button" key={p.id} aria-pressed={index === selected} onClick={() => { setSelected(index); setSelectedShelf(null); }} className={`rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-[#ea580c] ${index === selected ? "border-[#ea580c] bg-[#fff7ed]" : "border-[#e5e5e7] bg-white hover:border-[#fdba74]"}`}><span className="block text-[10px] font-semibold uppercase tracking-wide text-[#ea580c]">{index === 0 ? (form.optimization === "economico" ? "Mais económico" : "Mais comprimento de estantes") : "Alternativa"}</span><span className="mt-2 block text-sm font-semibold">{p.label}{p.centralCount ? " · com centro" : " · junto às paredes"}</span><span className="mt-1 block text-xs text-[#6e6e73]">{p.shelves.length} módulos · {meters(p.runLength)} m de estantes</span><span className="mt-2 block text-sm font-semibold text-[#1d1d1f]">{validLevels ? money((() => { const subtotal = estimateSpacePlan(p, models.filter((m) => m.type === type), Number(form.levels), form.material)?.subtotal || 0; return subtotal * (1 - (type === "picking" ? pickingDiscountRate(subtotal) : 0)); })()) : "—"} <span className="text-[10px] font-normal text-[#86868b]">sem IVA</span></span></button>)}</div>
              </section>
              <section className="rounded-[30px] border border-[#e5e5e7] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#ea580c]">Estimativa das estantes</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-(--orange)">{estimate && validLevels ? money(discountedTotal) : "—"}<span className="ml-2 text-xs font-normal text-[#86868b]">sem IVA</span></h2></div></div>
                <p className="mt-3 text-xs leading-relaxed text-[#6e6e73]">{plan.shelves.length} módulos · {form.levels} níveis por módulo{type === "picking" ? ` · Tampo: ${form.material}` : ""}. Os módulos seguidos na mesma fila partilham o bastidor: uma fila de N módulos leva N + 1 bastidores. Inclui os componentes do catálogo, sem transporte ou montagem.</p>
                {discountRate > 0 && validLevels && <p className="mt-2 text-sm font-semibold text-[#0879C0]">Desconto de {discountRate * 100}% aplicado: −{money(estimate.subtotal * discountRate)}</p>}
                {!validLevels && <p role="alert" className="mt-3 text-xs text-amber-800">Escolha um número inteiro de níveis entre {type === "racks" ? 1 : 2} e 11 para calcular o preço.</p>}
                <button type="button" onClick={orderSpace} disabled={!estimate || !validLevels || !plan.shelves.length} className="simulator-pill mt-5 flex w-full cursor-pointer items-center justify-center rounded-full bg-(--orange) px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">Encomendar</button>
                <p className="mt-4 text-xs leading-relaxed text-[#86868b]">Ao valor acresce IVA à taxa legal em vigor. Transporte não incluído. Configuração sujeita a validação técnica.</p>
              </section>
              <section className="rounded-2xl border border-[#e5e5e7] bg-white p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><IoGridOutline />Do desenho à configuração</h2><p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">Sugestão geométrica baseada nas medidas do catálogo, com folga adicional para bastidores e 20 cm até ao teto. O comprimento indicado soma as filas; não é uma fila contínua. Os corredores para paletes devem ser validados para o equipamento de movimentação utilizado. Esta planta não valida capacidades de carga e ainda não considera pilares, outras portas ou obstáculos. Confirme acessos, abertura da porta e instalação com a nossa equipa.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={onClose} className="rounded-full bg-(--orange) px-5 py-2.5 text-xs font-semibold text-white">Voltar à configuração da fila</button><Link href="/orcamento" className="rounded-full border border-[#e5e5e7] px-5 py-2.5 text-xs font-semibold text-[#343438]">Pedir apoio para este espaço</Link></div><p className="mt-3 text-[11px] text-[#86868b]">Ao encomendar, a planta e os componentes desta disposição seguem anexados ao pedido.</p></section>
            </>}
          </div>
        </div>
      </div>
      <SimulatorOrderModal open={orderOpen} onClose={() => setOrderOpen(false)} total={orderQuoteRef.current?.total || 0} details={orderQuoteRef.current?.details} items={orderQuoteRef.current?.items || []} discountPercent={orderQuoteRef.current?.discountPercent || 0} drawingRef={drawingRef} />
    </section>
  );
}
