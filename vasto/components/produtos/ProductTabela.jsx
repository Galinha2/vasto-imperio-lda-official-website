"use client";
import { useState } from "react";
import { useLanguage } from "../header/LanguageContext";

function ProductTabela({ product }) {
  const { language } = useLanguage();
  const isPT = language === "pt";
  const [showTable, setShowTable] = useState(false);

  if (!product.tabela || product.tabela.length === 0) return null;

  const hasAcabamento = product.tabela.some((item) => item.acabamento);
  const hasCodigo = product.tabela.some((item) => item.codigo);
  const hasAltura = product.tabela.some((item) => item.altura_mm);
  const hasComprimentos = product.tabela.some((item) => item.comprimento_mm);
  const hasMedidas = product.tabela.some((item) => item.medidas_mm);
  const hasLargura = product.tabela.some((item) => item.largura_mm || item.profundidade_mm);

  return (
    <div className="p-5 max-w-450 m-auto">
      <div className="flex items-center justify-center w-full">
        <button
          onClick={() => setShowTable(!showTable)}
          className="mb-4 shadow-md m-auto cursor-pointer px-5 py-2 rounded-full bg-(--orange) text-white hover:bg-() transition"
        >
          {showTable
            ? isPT
              ? "Esconder Tabela de Dimenções"
              : "Hide Table"
            : isPT
            ? "Mostrar Tabela de Dimenções"
            : "Show Table"}
        </button>
      </div>

      {showTable && (
        <div className="overflow-x-auto rounded-[20px] border border-(--horizontal-line)">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                {hasCodigo ? (
                  <th className="border border-(--horizontal-line) px-4 py-2">
                    {isPT ? "Código" : "Code"}
                  </th>
                ) : (
                  <th className="border border-(--horizontal-line) px-4 py-2">
                    {isPT ? "Nome" : "Name"}
                  </th>
                )}
                {hasAltura && (
                  <th className="border border-(--horizontal-line) px-4 py-2">
                    {isPT ? "Altura (mm)" : "Height (mm)"}
                  </th>
                )}
                {hasMedidas && (
                  <th className="border border-(--horizontal-line) px-4 py-2">
                    {isPT ? "Medidas (mm)" : "Measurements (mm)"}
                  </th>
                )}
                {hasComprimentos && (
                  <th className="border border-(--horizontal-line) px-4 py-2">
                    {isPT ? "Comprimento (mm)" : "Length (mm)"}
                  </th>
                )}
                {hasLargura && (<th className="border border-(--horizontal-line) px-4 py-2">
                  {isPT ? "Largura (mm)" : "Width (mm)"}
                </th>)}
                {hasAcabamento && (
                  <th className="border border-(--horizontal-line) px-4 py-2">
                    {isPT ? "Acabamento" : "Finish"}
                  </th>
                )}
                <th className="border border-(--horizontal-line) px-4 py-2">
                  {isPT ? "Peso (Kg)" : "Weight (Kg)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {product.tabela.map((item, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border border-(--horizontal-line) px-4 py-2">
                    {item.codigo || item.nome || "-"}
                  </td>
                  <td className="border border-(--horizontal-line) px-4 py-2">
                    {item.altura_mm || item.comprimento_mm || item.medidas_mm || "-"}
                  </td>
                  {hasLargura && <td className="border border-(--horizontal-line) px-4 py-2">
                    {item.profundidade_mm || item.largura_mm || "-"}
                  </td>}
                  {hasAcabamento && (
                    <td className="border border-(--horizontal-line) px-4 py-2">
                      {item.acabamento || "-"}
                    </td>
                  )}
                  <td className="border border-(--horizontal-line) px-4 py-2">
                    {item.peso_kg != null ? item.peso_kg.toFixed(2) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProductTabela;