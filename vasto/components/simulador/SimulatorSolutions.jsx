"use client";

import { useLanguage } from "@/components/header/LanguageContext";

const formatMeters = (millimeters) => `${(millimeters / 1000).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
const formatPrice = (price) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(price);

export function buildSimilarSolutions(baseModules, targetLength, { getModules, getTotalLength, getPrice, step = 250, maxSteps = 20 }) {
  const signature = (modules) => modules.join(",");
  if (!baseModules?.length) return [];
  const base = { id: "chosen", label: "A tua escolha", modules: baseModules };
  const result = [base];
  for (const direction of [-1, 1]) {
    for (let index = 1; index <= maxSteps; index += 1) {
      const candidate = getModules(targetLength + direction * step * index);
      if (!candidate?.length || signature(candidate) === signature(baseModules)) continue;
      if (result.some((solution) => signature(solution.modules) === signature(candidate))) continue;
      const totalLength = getTotalLength(candidate);
      if (direction < 0 && totalLength >= getTotalLength(baseModules)) continue;
      if (direction > 0 && totalLength <= getTotalLength(baseModules)) continue;
      result.push({ id: direction < 0 ? "shorter" : "longer", label: direction < 0 ? "Mais curta" : "Mais comprida", modules: candidate });
      break;
    }
  }
  return result.map((solution) => ({ ...solution, totalLength: getTotalLength(solution.modules), price: getPrice(solution.modules) }));
}

export default function SimulatorSolutions({ solutions, selectedId, onSelect }) {
  const { language } = useLanguage();
  const english = language === "en";
  const formatMeters = (value) => `${(value / 1000).toLocaleString(english ? "en-IE" : "pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  const formatPrice = (value) => new Intl.NumberFormat(english ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR" }).format(value);
  if (!solutions?.length) return null;
  return (
    <section className="mt-5" aria-label={english ? "Similar solutions" : "Soluções semelhantes"}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#1d1d1f]">{english ? "Similar solutions" : "Soluções semelhantes"}</h3>
        <p className="text-xs text-[#86868b]">{english ? "Based on your selected dimensions" : "Baseadas nas medidas escolhidas"}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {solutions.map((solution) => (
          <button key={solution.id} type="button" onClick={() => onSelect(solution.id)} aria-pressed={selectedId === solution.id}
            className={`min-w-[155px] shrink-0 cursor-pointer rounded-[30px] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#0071e3] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] ${selectedId === solution.id ? "border-[#0071e3] bg-[#f5faff] shadow-sm" : "border-[#e5e5e7] bg-white"}`}>
            <span className="block text-xs font-medium text-[#6e6e73]">{english ? ({ chosen: "Your choice", shorter: "Shorter", longer: "Longer" }[solution.id] ?? solution.label) : solution.label}</span>
            <strong className="mt-1 block text-lg font-semibold tracking-tight text-[#1d1d1f]">{formatMeters(solution.totalLength)}</strong>
            <span className="mt-1 block text-xs text-[#6e6e73]">{solution.modules.length} {english ? "modules" : "módulos"}</span>
            <span className="mt-2 block text-sm font-semibold text-(--orange)">{formatPrice(solution.price)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
