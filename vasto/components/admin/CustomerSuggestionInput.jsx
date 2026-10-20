"use client";
import { useEffect, useId, useState } from "react";
export default function CustomerSuggestionInput({ field, value, onChange, onSelect, ...props }) {
  const [focused, setFocused] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(-1);
  const id = useId();
  useEffect(() => {
    setCustomers([]); setSelected(-1);
    if (!focused || String(value).trim().length < (field === "nif" ? 1 : 2)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/customers?field=${field}&q=${encodeURIComponent(value)}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (response.ok && !controller.signal.aborted) setCustomers(result.customers || []);
      } catch { /* Suggestions must not prevent manual entry. */ }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, field, focused]);
  const pick = (customer) => { onSelect(customer); setFocused(false); setCustomers([]); };
  return <div className="relative min-w-0">
    <input {...props} value={value} onChange={onChange} autoComplete="off" role="combobox" aria-label={props["aria-label"] || props.placeholder} aria-autocomplete="list" aria-expanded={focused && customers.length > 0} aria-controls={id} aria-activedescendant={selected >= 0 ? `${id}-${selected}` : undefined} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={(event) => {
      if (event.key === "Escape") setFocused(false);
      if (!focused || !customers.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSelected((current) => event.key === "ArrowDown" ? Math.min(customers.length - 1, current + 1) : Math.max(0, current - 1)); }
      if (event.key === "Enter" && selected >= 0) { event.preventDefault(); pick(customers[selected]); }
    }} />
    {focused && customers.length > 0 && <div id={id} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[#e5e5e7] bg-white p-1.5 shadow-xl">
      {customers.map((customer, index) => <button key={`${customer.nif}-${customer.name}`} id={`${id}-${index}`} type="button" role="option" aria-selected={selected === index} onPointerDown={(event) => event.preventDefault()} onClick={() => pick(customer)} className={`block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left ${selected === index ? "bg-orange-50" : "hover:bg-[#f5f5f7]"}`}><span className="block truncate text-xs font-semibold text-[#1d1d1f]">{customer.name}</span><span className="mt-0.5 block text-[11px] text-[#86868b]">{customer.nif || "Sem NIF"}{customer.address ? ` · ${customer.address}` : ""}</span></button>)}
    </div>}
  </div>;
}
