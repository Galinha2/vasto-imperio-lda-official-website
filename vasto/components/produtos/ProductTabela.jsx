"use client";

import { useLanguage } from "../header/LanguageContext";

const columns = [
  ["altura_mm", "Altura (mm)", "Height (mm)"],
  ["profundidade_mm", "Profundidade (mm)", "Depth (mm)"],
  ["comprimento_mm", "Comprimento (mm)", "Length (mm)"],
  ["largura_mm", "Largura (mm)", "Width (mm)"],
  ["bracos_mm", "Braços (mm)", "Arms (mm)"],
  ["medidas_mm", "Medidas (mm)", "Measurements (mm)"],
  ["acabamento", "Acabamento", "Finish"],
  ["peso_kg", "Peso (kg)", "Weight (kg)"],
];

export default function ProductTabela({ tabela = [] }) {
  const { language } = useLanguage();
  const isPT = language === "pt";
  if (!Array.isArray(tabela) || tabela.length === 0) return null;

  const visibleColumns = columns.filter(([key]) => tabela.some((item) => item[key] !== undefined && item[key] !== ""));

  return (
    <section className="mx-auto max-w-[1440px] px-5 sm:px-8">
      <header className="mb-7 max-w-3xl sm:mb-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">
          {isPT ? "Dados técnicos" : "Technical data"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">
          {isPT ? "Medidas e especificações" : "Dimensions and specifications"}
        </h2>
      </header>
      <div className="overflow-x-auto rounded-[24px] border border-[#e5e5e7] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.035)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#f5f5f7] text-xs font-semibold uppercase tracking-[0.08em] text-[#626268]">
              <th scope="col" className="px-5 py-4 sm:px-6">{isPT ? "Referência" : "Reference"}</th>
              {visibleColumns.map(([key, labelPT, labelEN]) => (
                <th scope="col" key={key} className="px-5 py-4 sm:px-6">{isPT ? labelPT : labelEN}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabela.map((item, index) => (
              <tr key={`${item.codigo || item.nome || "item"}-${index}`} className="border-t border-[#ececef] text-[#55565c] transition-colors hover:bg-[#fafafc]">
                <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold text-[#1d1d1f] sm:px-6">{item.codigo || item.nome || "—"}</th>
                {visibleColumns.map(([key]) => (
                  <td key={key} className="px-5 py-4 sm:px-6">{item[key] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
