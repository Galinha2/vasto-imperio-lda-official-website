"use client";
import { useId, useState } from 'react';
import { IoCallOutline, IoChevronDownOutline } from 'react-icons/io5';

export default function CustomerPhoneButton({ sale, inline = false }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const phone = sale.orderDetails?.telefone || sale.customerPhone || '';
  if (!phone) return null;
  const numbers = String(phone).split(/[/,;]+/).map((value) => value.trim()).filter(Boolean);
  return <div className={inline ? "relative shrink-0" : "mt-2"} onClick={(event) => event.stopPropagation()}>
    <button type="button" title={open ? "Ocultar contacto" : "Ver contacto"} aria-label={open ? "Ocultar contacto" : "Ver contacto"} aria-expanded={open} aria-controls={id} onClick={() => setOpen((current) => !current)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfe3e8] bg-white/70 px-2.5 py-1.5 text-[10px] font-medium text-[#626b79] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0879c0]">
      <IoCallOutline aria-hidden="true" /><span className={inline ? "hidden sm:inline 2xl:hidden" : ""}>{open ? 'Ocultar contacto' : 'Ver contacto'}</span><IoChevronDownOutline aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id={id} className={`${inline ? "absolute left-0 top-full z-50 w-max max-w-[240px]" : ""} mt-2 flex flex-col items-start gap-2 rounded-2xl border border-white/80 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-xl`}>
      {numbers.map((number, index) => <a key={`${number}-${index}`} href={`tel:${number.replace(/[^\d+]/g, '')}`} aria-label={`Ligar para ${number}, ${sale.customerName}`} className="inline-flex max-w-full items-center gap-2 font-medium text-[#424245] hover:text-[#0879c0]"><IoCallOutline aria-hidden="true" className="shrink-0" /><span className="break-words">{number}</span></a>)}
    </div>}
  </div>;
}
