"use client";

import SimulatorDropdown from "@/components/simulador/SimulatorDropdown";
import { useLanguage } from "@/components/header/LanguageContext";

export default function SimulatorConfigurationOptions({
  rowCount,
  onRowCountChange,
  sameBeamLength,
  onSameBeamLengthChange,
  desiredBeamLength,
  onDesiredBeamLengthChange,
  sameLengthToggleLabel = "Vigas do mesmo comprimento",
  sameLengthSelectLabel = "Comprimento pretendido das vigas (m)",
  sameLengthOptions,
  sameLengthFormat,
  rowCountLabel,
  rowCountDescriptions,
  automaticLengthMessage,
}) {
  const { language } = useLanguage();
  const english = language === "en";
  const rowsDescription = rowCountDescriptions || (english
    ? ["One standalone shelving line", "Two parallel shelving lines", "Three parallel shelving lines"]
    : ["Uma linha de estantes isolada", "Duas linhas de estantes paralelas", "Três linhas de estantes paralelas"]);
  return (
    <div className="sm:col-span-2 space-y-4 rounded-[30px] bg-[#f5f5f7] p-5">
      <div>
        <p className="mb-1 text-sm font-semibold text-[#424245]">{rowCountLabel || (english ? "How many shelving lines do you need?" : "Quantas linhas de estantes pretende?")}</p>
        <p className="mb-3 text-xs leading-relaxed text-[#86868b]">{english ? "Choose how many identical lines to place side by side." : "Escolha quantas linhas iguais pretende instalar lado a lado."}</p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={rowCount === count}
              aria-label={`${count} ${english ? `shelving line${count === 1 ? "" : "s"}` : `fila${count === 1 ? "" : "s"}`}: ${rowsDescription[count - 1]}`}
              onClick={() => onRowCountChange(count)}
              className={`simulator-pill flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${rowCount === count ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm hover:bg-[#0062c4]" : "border-[#d2d2d7] bg-white text-[#424245] hover:border-[#0071e3] hover:bg-[#f5f9ff]"}`}
            >
              <span aria-hidden="true" className="flex h-7 items-center gap-1">
                {Array.from({ length: count }, (_, index) => <span key={index} className={`h-2 w-8 rounded-full ${rowCount === count ? "bg-white" : "bg-sky-600"}`} />)}
              </span>
              <span className="text-sm font-semibold">{count} {english ? `line${count === 1 ? "" : "s"}` : `fila${count === 1 ? "" : "s"}`}</span>
              <span className={`text-[10px] leading-tight ${rowCount === count ? "text-white/85" : "text-[#86868b]"}`}>{rowsDescription[count - 1]}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={sameBeamLength}
            onClick={() => onSameBeamLengthChange(!sameBeamLength)}
            className={`simulator-pill flex min-w-0 flex-1 cursor-pointer items-center justify-between rounded-full border px-4 py-3 text-left text-sm font-semibold transition ${sameBeamLength ? "border-[#0071e3] bg-white text-[#1d1d1f] ring-4 ring-[#0071e3]/10" : "border-[#d2d2d7] bg-white text-[#424245] hover:border-[#a1a1a6]"}`}
          >
            <span>{sameLengthToggleLabel}</span>
            <span aria-hidden="true" className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${sameBeamLength ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-[#a1a1a6] text-transparent"}`}>✓</span>
          </button>
          {!sameBeamLength && automaticLengthMessage && (
            <div className="simulator-info group relative shrink-0">
              <button
                type="button"
                aria-label={english ? "Information about automatic calculation" : "Informação sobre o cálculo automático"}
                aria-describedby="automatic-length-info"
                tabIndex={-1}
                className="flex h-10 w-10 cursor-help items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-sm font-semibold text-[#6e6e73] transition hover:border-[#a1a1a6] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              >
                i
              </button>
              <span
                id="automatic-length-info"
                role="tooltip"
                className="simulator-info-tooltip absolute right-0 top-full z-30 mt-2 hidden w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-[#e5e5e7] bg-white p-4 text-xs font-normal leading-relaxed text-[#525258] shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
              >
                {automaticLengthMessage}
              </span>
            </div>
          )}
        </div>
        {sameBeamLength && (
          sameLengthOptions?.length ? (
            <div className="mt-3">
              <SimulatorDropdown
                label={sameLengthSelectLabel}
                value={desiredBeamLength}
                onChange={onDesiredBeamLengthChange}
                options={sameLengthOptions}
                format={sameLengthFormat}
              />
            </div>
          ) : (
            <label className="mt-3 block space-y-2">
              <span className="block text-sm font-medium text-[#424245]">{sameLengthSelectLabel}</span>
              <div className="simulator-pill flex items-center rounded-full border border-[#d2d2d7] bg-white px-5 transition focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/10">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={desiredBeamLength}
                  onChange={(event) => onDesiredBeamLengthChange(event.target.value.slice(0, 6))}
                  onBlur={() => {
                    const parsed = Number(desiredBeamLength);
                    if (parsed > 0) onDesiredBeamLengthChange(parsed.toFixed(2));
                  }}
                  className="w-full bg-transparent py-3 text-[15px] font-medium text-[#1d1d1f] outline-none"
                  aria-label={sameLengthSelectLabel}
                />
                <span className="text-sm font-medium text-[#86868b]">m</span>
              </div>
              <span className="block text-xs text-[#86868b]">{english ? "The closest available catalogue size will be used." : "Será usada a medida disponível no catálogo mais próxima."}</span>
            </label>
          )
        )}
      </div>
    </div>
  );
}
