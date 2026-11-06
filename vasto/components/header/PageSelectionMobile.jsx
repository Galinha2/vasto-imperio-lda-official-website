"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "./LanguageContext";
import { IoChevronForwardOutline } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function PageSelectionMobile({ isOpen, setIsOpen }) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const content = language === "pt" ? contentpt : contenten;
  const [portalRoot, setPortalRoot] = useState(null);
  const nav = useRef(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const closeOnOutsideClick = (event) => {
      if (nav.current?.contains(event.target) || event.target.closest?.("[data-mobile-menu-toggle]")) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", closeOnEscape);
      document.addEventListener("pointerdown", closeOnOutsideClick);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen || !portalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        aria-label={language === "pt" ? "Fechar menu" : "Close menu"}
        className="absolute inset-x-0 bottom-0 top-16 w-full cursor-pointer bg-[#1d1d1f]/15 backdrop-blur-[2px]"
        onClick={() => setIsOpen(false)}
      />
      <nav
        ref={nav}
        aria-label={language === "pt" ? "Menu principal" : "Main menu"}
        className="absolute inset-x-3 top-[72px] mx-auto max-h-[calc(100dvh-84px)] max-w-[420px] overflow-y-auto rounded-[24px] border border-white/80 bg-white/90 p-3 shadow-[0_18px_56px_rgba(29,29,31,0.16)] backdrop-blur-xl sm:inset-x-5 sm:top-[76px] sm:p-4"
      >
        <div className="px-3 pb-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
            {language === "pt" ? "Navegação" : "Explore"}
          </p>
        </div>
        <ul className="flex flex-col gap-0.5">
          {content.header.links.map((item) => {
            const active = pathname === item.url;
            return (
              <li key={item.url}>
                <Link
                  href={item.url}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                  className={`flex min-h-12 items-center justify-between rounded-[14px] px-3 text-[15px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0879c0] ${active ? "bg-[#f2f7fb] text-[#0879c0]" : "text-[#303034] hover:bg-[#f5f5f7] active:bg-[#eceef2]"}`}
                >
                  {item.label}
                  <IoChevronForwardOutline aria-hidden="true" className="ml-3 shrink-0 text-[15px] text-[#a1a1a6]" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>,
    portalRoot
  );
}
