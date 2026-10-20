"use client";

import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import { usePathname } from "next/navigation";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "./LanguageContext";
import { IoClose } from "react-icons/io5";
import { useEffect } from "react";

export default function PageSelectionMobile({ isOpen, setIsOpen }) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const content = language === "pt" ? contentpt : contenten;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", closeOnEscape);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        aria-label={language === "pt" ? "Fechar menu" : "Close menu"}
        className="absolute inset-0 h-full w-full cursor-pointer bg-[#1d1d1f]/20 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <nav
        aria-label={language === "pt" ? "Menu principal" : "Main menu"}
        className="site-glass site-popover absolute inset-x-3 top-[72px] mx-auto max-h-[calc(100dvh-84px)] max-w-[420px] overflow-y-auto rounded-[28px] border border-[#e5e5e7] bg-white p-4 shadow-[0_24px_70px_rgba(29,29,31,0.2)] sm:inset-x-5 sm:top-[76px] sm:p-5"
      >
        <div className="flex items-center justify-between border-b border-[#e5e5e7] px-2 pb-4">
          <div className="flex items-center gap-3">
            <Image src={content.header.logoMini} alt="Vasto Império" width={42} height={42} priority className="h-10 w-10 object-contain" />
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em] text-[#1d1d1f]">Vasto Império</p>
              <p className="mt-0.5 text-xs text-[#86868b]">Benedita · Viseu</p>
            </div>
          </div>
          <button
            type="button"
            aria-label={language === "pt" ? "Fechar menu" : "Close menu"}
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#f5f5f7] text-xl text-[#424245] transition hover:bg-[#eceef2]"
          >
            <IoClose aria-hidden="true" />
          </button>
        </div>
        <ul className="flex flex-col gap-1 pt-3">
          {content.header.links.map((item) => {
            const active = pathname === item.url;
            return (
              <li key={item.url}>
                <Link
                  href={item.url}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                  className={`flex min-h-14 items-center justify-between rounded-2xl px-4 text-base font-medium transition-colors ${active ? "bg-[#f5f5f7] text-(--orange)" : "text-[#303034] hover:bg-[#f5f5f7]"}`}
                >
                  {item.label}
                  <span aria-hidden="true" className="text-xl font-normal text-[#a1a1a6]">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
