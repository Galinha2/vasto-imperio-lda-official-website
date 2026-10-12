"use client";

import SimulatorDropdown from "@/components/simulador/SimulatorDropdown";

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
  return (
    <div className="sm:col-span-2 space-y-4 rounded-[30px] bg-[#f5f5f7] p-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-[#424245]">Número de filas iguais</p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={rowCount === count}
              onClick={() => onRowCountChange(count)}
              className={`simulator-pill cursor-pointer rounded-full border px-3 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${rowCount === count ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm hover:bg-[#0062c4]" : "border-[#d2d2d7] bg-white text-[#424245] hover:border-[#0071e3] hover:bg-[#f5f9ff]"}`}
            >
              {count === 1 ? "Fila simples" : count === 2 ? "Fila dupla" : "Fila tripla"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <button
          type="button"
          aria-pressed={sameBeamLength}
          onClick={() => onSameBeamLengthChange(!sameBeamLength)}
          className={`simulator-pill flex w-full cursor-pointer items-center justify-between rounded-full border px-4 py-3 text-left text-sm font-semibold transition ${sameBeamLength ? "border-[#0071e3] bg-white text-[#1d1d1f] ring-4 ring-[#0071e3]/10" : "border-[#d2d2d7] bg-white text-[#424245] hover:border-[#a1a1a6]"}`}
        >
          <span>{sameLengthToggleLabel}</span>
          <span aria-hidden="true" className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${sameBeamLength ? "border-[#0071e3] bg-[#0071e3] text-white" : "border-[#a1a1a6] text-transparent"}`}>✓</span>
        </button>
        {!sameBeamLength && automaticLengthMessage && <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">{automaticLengthMessage}</p>}
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
              <span className="block text-xs text-[#86868b]">Será usada a medida disponível no catálogo mais próxima.</span>
            </label>
          )
        )}
      </div>
    </div>
  );
}
