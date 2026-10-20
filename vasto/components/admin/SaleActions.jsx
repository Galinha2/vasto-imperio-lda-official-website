"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IoChevronDownOutline, IoCreateOutline, IoImagesOutline, IoOpenOutline, IoTrashOutline, IoUnlinkOutline } from "react-icons/io5";
import QuoteEmailButton from "./QuoteEmailButton";

export default function SaleActions({ sale, imagesOpen, onImages, onUngroup, grouping, onDelete }) {
  const [position, setPosition] = useState(null);
  const button = useRef(null);
  const menu = useRef(null);
  useEffect(() => {
    if (!position) return;
    const outside = (event) => {
      if (!button.current?.contains(event.target) && !menu.current?.contains(event.target) && !event.target.closest('[role="dialog"]')) setPosition(null);
    };
    const escape = (event) => { if (event.key === "Escape") setPosition(null); };
    let frame;
    const reposition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!button.current) return;
        const rect = button.current.getBoundingClientRect();
        const height = menu.current?.offsetHeight || 290;
        const below = rect.bottom + 6;
        const top = below + height <= window.innerHeight - 8 ? below : rect.top - height - 6;
        const left = Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228));
        setPosition((current) => current && current.top === top && current.left === left ? current : current ? { top, left } : null);
      });
    };
    reposition();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); cancelAnimationFrame(frame); };
  }, [!!position]);
  const item = "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-[#424245] transition hover:bg-[#f5f5f7]";
  return <>
    <button ref={button} type="button" aria-expanded={!!position} aria-label={`Ações do orçamento de ${sale.customerName}`} onClick={() => {
      if (position) { setPosition(null); return; }
      const rect = button.current.getBoundingClientRect();
      setPosition({ top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 310)), left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)) });
    }} className="ml-auto flex cursor-pointer items-center gap-2 rounded-full border border-[#e5e5e7] bg-white px-3 py-2 text-xs font-medium text-[#424245] hover:bg-[#f5f5f7]">Ações<IoChevronDownOutline /></button>
    {position && createPortal(<div ref={menu} style={position} className="fixed z-[100] w-[220px] rounded-2xl border border-[#e5e5e7] bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
      <a href={`/api/admin/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer" onClick={() => setPosition(null)} className={item}><IoOpenOutline className="text-base" />Abrir orçamento PDF</a>
      <Link href={`/admin/orcamentos?editar=${sale.id}`} className={item}><IoCreateOutline className="text-base" />Editar artigos e quantidades</Link>
      <QuoteEmailButton sale={sale} menuItem />
      <button type="button" onClick={() => { onImages(); setPosition(null); }} className={item}><IoImagesOutline className="text-base" />{imagesOpen ? "Fechar desenhos e detalhes" : "Desenhos e detalhes"}{!!sale.images?.length && <span className="ml-auto rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px]">{sale.images.length}</span>}</button>
      {sale.quoteGroupId && <button type="button" disabled={grouping} onClick={() => { onUngroup(); setPosition(null); }} className={item}><IoUnlinkOutline className="text-base" />Retirar do grupo</button>}
      <div className="my-1 border-t border-[#f0f0f2]" />
      <button type="button" onClick={() => { onDelete(); setPosition(null); }} className={`${item} !text-red-600 hover:!bg-red-50`}><IoTrashOutline className="text-base" />Eliminar orçamento</button>
    </div>, document.body)}
  </>;
}
