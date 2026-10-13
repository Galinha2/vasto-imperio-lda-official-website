"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import SimulatorOrderModal from "@/components/simulador/SimulatorOrderModal";
import createQuoteLines from "@/components/simulador/createQuoteLines";

export default function HandlingOrderPanel({ product, label, english = false, embedded = false, imageSrc }) {
  const [quantity, setQuantity] = useState(1);
  const [open, setOpen] = useState(false);
  const price = Number(product?.["preço"]) || 0;
  const total = price * quantity;
  const currency = new Intl.NumberFormat(english ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR" });
  const copy = english
    ? { quantity: "Quantity", unit: "per unit", vat: "+ VAT at the applicable rate", order: "Place order" }
    : { quantity: "Quantidade", unit: "por unidade", vat: "+ IVA à taxa legal em vigor", order: "Encomendar" };
  const items = createQuoteLines([{ product, quantity }], 5);
  const details = [
    `${english ? "Product" : "Produto"}: ${product?.produto || label}`,
    `${copy.quantity}: ${quantity}`,
    `${english ? "Unit price" : "Preço unitário"}: ${currency.format(price)}`,
  ].join(" · ");

  return (
    <>
      <div className={embedded ? "mt-6 border-t border-[#e5e5e7] pt-6" : "mt-6 rounded-[24px] border border-[#e5e5e7] bg-[#f5f5f7] p-5 sm:p-6"}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#6e6e73]">{copy.quantity}</p>
            <div className="mt-2 inline-flex h-11 items-center rounded-full border border-[#dedee3] bg-white p-1">
              <button type="button" aria-label={english ? "Decrease quantity" : "Diminuir quantidade"} disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-lg text-[#424245] transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-35">−</button>
              <input aria-label={copy.quantity} type="number" min="1" max="99" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(99, Math.trunc(Number(event.target.value)) || 1)))} className="w-12 appearance-none bg-transparent text-center text-sm font-semibold text-[#1d1d1f] outline-none" />
              <button type="button" aria-label={english ? "Increase quantity" : "Aumentar quantidade"} disabled={quantity >= 99} onClick={() => setQuantity((current) => Math.min(99, current + 1))} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-lg text-[#424245] transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-35">+</button>
            </div>
          </div>
          <div className="min-w-[150px] text-right">
            <p className="text-sm text-[#6e6e73]">{currency.format(price)} {copy.unit}</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">{currency.format(total)}</p>
            <p className="mt-0.5 text-xs text-[#86868b]">{copy.vat}</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={`mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-(--orange) px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--orange-hover) ${embedded ? "" : "sm:w-auto"}`}>
          {copy.order}<span className="ml-2" aria-hidden="true">→</span>
        </button>
      </div>

      {open && createPortal(
        <SimulatorOrderModal
          open={open}
          onClose={() => setOpen(false)}
          total={total}
          details={details}
          items={items}
          imageSrc={imageSrc || product?.image}
          english={english}
        />, document.body
      )}
    </>
  );
}
