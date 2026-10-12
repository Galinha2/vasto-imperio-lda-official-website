"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function Chevron({ open }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-[#6e6e73] transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export default function SimulatorDropdown({ label, value, onChange, options, format = (option) => option }) {
  const [open, setOpen] = useState(false);
  const [scrollbar, setScrollbar] = useState({ visible: false, height: 0, top: 0 });
  const dropdownRef = useRef(null);
  const listboxRef = useRef(null);

  const updateScrollbar = useCallback(() => {
    const element = listboxRef.current;
    if (!element) return;
    const trackHeight = Math.max(0, element.clientHeight - 16);
    const visible = element.scrollHeight > element.clientHeight + 1;
    const height = visible ? Math.max(22, trackHeight * element.clientHeight / element.scrollHeight) : 0;
    const maxScroll = element.scrollHeight - element.clientHeight;
    const top = maxScroll > 0 ? (trackHeight - height) * element.scrollTop / maxScroll : 0;
    setScrollbar((current) => current.visible === visible && current.height === height && current.top === top
      ? current
      : { visible, height, top });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const element = listboxRef.current;
    if (!element) return undefined;
    updateScrollbar();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollbar) : null;
    const mutationObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(updateScrollbar) : null;
    resizeObserver?.observe(element);
    mutationObserver?.observe(element, { childList: true, subtree: true });
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [open, updateScrollbar]);

  return (
    <div className="block min-w-0 space-y-2">
      <span className="block text-sm font-semibold text-[#424245]">{label}</span>
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className={`simulator-pill flex w-full cursor-pointer items-center justify-between rounded-full border bg-[#fbfbfd] py-3.5 pl-5 pr-5 text-left text-[15px] font-medium text-[#1d1d1f] outline-none transition ${open ? "border-[#0071e3] ring-4 ring-[#0071e3]/10" : "border-[#d2d2d7] hover:border-[#a1a1a6]"}`}
        >
          <span>{format(value)}</span>
          <Chevron open={open} />
        </button>
        {open && (
          <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-64 overflow-hidden rounded-[30px] border border-[#e5e5e7] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.16)]">
            <div ref={listboxRef} onScroll={updateScrollbar} role="listbox" aria-label={label} className="simulator-dropdown-scroll max-h-64 overflow-y-auto py-1.5 pl-1.5 pr-4">
              {options.map((option) => {
                const selected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => { onChange(option); setOpen(false); }}
                    className={`simulator-pill flex w-full cursor-pointer items-center justify-between rounded-full px-3.5 py-2.5 text-left text-sm transition ${selected ? "bg-[#f5f5f7] font-semibold text-[#1d1d1f]" : "text-[#424245] hover:bg-[#f5f5f7]"}`}
                  >
                    <span>{format(option)}</span>
                    {selected && <span aria-hidden="true" className="text-[#0071e3]">✓</span>}
                  </button>
                );
              })}
            </div>
            {scrollbar.visible && <div aria-hidden="true" className="pointer-events-none absolute bottom-2 right-1.5 top-2 w-1 rounded-full bg-[#f0f0f2]"><div className="absolute left-0 right-0 rounded-full bg-[#8e8e93]" style={{ height: scrollbar.height, top: scrollbar.top }} /></div>}
          </div>
        )}
      </div>
    </div>
  );
}
