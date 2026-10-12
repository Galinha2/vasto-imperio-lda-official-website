"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "./LanguageContext";
import LanguageSelection from "./LanguageSelection";

export default function PageSelection() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const content = language === "pt" ? contentpt : contenten;

  return (
    <div className="flex items-center gap-5">
        <ul className="flex items-center gap-1">
          {content.header.links.map((item) => (
            <li key={item.url}>
              <Link
                href={item.url}
                aria-current={pathname === item.url ? "page" : undefined}
                className={`inline-flex min-h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors hover:bg-[#f5f5f7] ${
                  pathname === item.url ? "bg-[#f5f5f7] text-[#1d1d1f]" : "text-[#626268]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <LanguageSelection />
    </div>
  );
}
