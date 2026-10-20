"use client";
import Link from "next/link";
import { IoTrashOutline } from "react-icons/io5";
import QuoteEmailButton from "./QuoteEmailButton";

export default function SaleActions({ sale, groupSales, onUngroup, onSeparate, grouping, onDelete }) {
  return <div className="ml-auto w-[200px] max-w-full">
    <div className="flex flex-nowrap items-center gap-1.5">
      <Link href={`/admin/orcamentos?editar=${sale.id}`} className="inline-flex h-9 min-w-[58px] flex-1 whitespace-nowrap items-center justify-center rounded-full border border-[#e5e5e7] bg-white px-2.5 text-xs font-medium text-[#424245] transition hover:border-[#c8c9cf] hover:bg-[#f5f5f7]">Editar</Link>
      <QuoteEmailButton sale={sale} groupSales={groupSales} inlineAction />
      <button type="button" onClick={onDelete} aria-label={`Eliminar orçamento de ${sale.customerName}`} title="Eliminar orçamento" className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"><IoTrashOutline aria-hidden="true" className="text-sm" /></button>
    </div>
    <div className="mt-2 flex flex-wrap justify-end gap-x-3 gap-y-1 px-1">
      {!!sale.mergedQuoteIds?.length && <button type="button" onClick={onSeparate} className="cursor-pointer whitespace-nowrap text-[10px] text-[#0879c0] hover:underline">Separar orçamento</button>}
      {sale.quoteGroupId && <button type="button" disabled={grouping} onClick={onUngroup} className="cursor-pointer whitespace-nowrap text-[10px] text-[#86868b] hover:underline disabled:opacity-50">Retirar do grupo</button>}

    </div>
  </div>;
}
