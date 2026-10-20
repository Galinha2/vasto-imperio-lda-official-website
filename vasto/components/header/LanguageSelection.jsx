"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { useLanguage } from "./LanguageContext";

function LanguageSelection() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const languages = ["pt", "en"];

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={language === "pt" ? "Selecionar idioma" : "Select language"}
        className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#e5e5e7] bg-white/80 px-3 text-xs font-semibold uppercase tracking-wide text-[#424245] transition hover:bg-[#f5f5f7]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <IoIosArrowUp /> : <IoIosArrowDown />}
        <p>{language}</p>
      </button>
      {isOpen && (
        <ul className="site-glass site-popover absolute right-0 z-[500] mt-2 min-w-20 rounded-2xl border border-[#e5e5e7] bg-white p-1.5 shadow-[0_12px_32px_rgba(29,29,31,0.12)]">
          {languages.map((lang) => (
            <li
              key={lang}
              className={`cursor-pointer rounded-xl px-3 py-2 text-sm uppercase transition hover:bg-[#f5f5f7] ${language === lang ? "font-semibold text-(--orange)" : "text-[#424245]"}`}
              onClick={() => {
                setLanguage(lang);
                const localizedRoute = pathname?.match(/^(\/produtos|\/simulador)\/(pt|en)(\/.*)?$/);
                if (localizedRoute && localizedRoute[2] !== lang) {
                  router.replace(`${localizedRoute[1]}/${lang}${localizedRoute[3] ?? ""}`);
                }
                setIsOpen(false);
              }}
            >
              {lang}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LanguageSelection;
