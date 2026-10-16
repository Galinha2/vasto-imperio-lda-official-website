"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  automaticLengthMessage,
}) {
  const { language } = useLanguage();
  const [openInfo, setOpenInfo] = useState("");
  const [rowInput, setRowInput] = useState(String(rowCount));
  useEffect(() => setRowInput(String(rowCount)), [rowCount]);
  const infoRef = useRef(null);
  const infoId = useId();
  const english = language === "en";
  const rowCountInfo = english
    ? "Each repeat adds an identical row alongside the first. The selected length applies to every row."
    : "Cada repetição acrescenta uma fila igual ao lado da primeira. O comprimento escolhido aplica-se a cada fila.";


  useEffect(() => {
    if (!openInfo) return undefined;
    const closeOutside = (event) => {
      if (!infoRef.current?.contains(event.target)) setOpenInfo("");
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenInfo("");
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openInfo]);

  return (
    <div ref={infoRef} className="sm:col-span-2 space-y-4 rounded-[30px] bg-[#f5f5f7] p-5">
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className="block text-sm font-semibold text-[#424245]">
              {english ? "Total number of identical rows" : "Número total de filas iguais"}
              <input type="number" min="1" step="1" value={rowInput}
                onChange={(event) => { setRowInput(event.target.value); const count = Number(event.target.value); if (Number.isSafeInteger(count) && count >= 1) onRowCountChange(count); }}
                onBlur={() => setRowInput(String(rowCount))}
                className="mt-2 h-11 w-full rounded-full border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] outline-none focus:border-[#ff5500]" />
            </label>
          </div>
          <div className="simulator-info group relative shrink-0" data-open={openInfo === "row-count"}>
            <button
              type="button"
              aria-label={english ? "Information about repeating rows" : "Informação sobre a repetição das filas"}
              aria-expanded={openInfo === "row-count"}
              aria-describedby={`${infoId}-row-count`}
              onClick={() => setOpenInfo((current) => current === "row-count" ? "" : "row-count")}
              className="flex h-10 w-10 cursor-help items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-sm font-semibold text-[#6e6e73] transition hover:border-[#a1a1a6] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              i
            </button>
            <span
              id={`${infoId}-row-count`}
              role="tooltip"
              className="simulator-info-tooltip absolute right-0 top-full z-30 mt-2 hidden w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-[#e5e5e7] bg-white p-4 text-xs font-normal leading-relaxed text-[#525258] shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
            >
              {rowCountInfo}
            </span>
          </div>
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
            <div className="simulator-info group relative shrink-0" data-open={openInfo === "automatic-length"}>
              <button
                type="button"
                aria-label={english ? "Information about automatic calculation" : "Informação sobre o cálculo automático"}
                aria-expanded={openInfo === "automatic-length"}
                aria-describedby={`${infoId}-automatic-length`}
                onClick={() => setOpenInfo((current) => current === "automatic-length" ? "" : "automatic-length")}
                className="flex h-10 w-10 cursor-help items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-sm font-semibold text-[#6e6e73] transition hover:border-[#a1a1a6] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              >
                i
              </button>
              <span
                id={`${infoId}-automatic-length`}
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
