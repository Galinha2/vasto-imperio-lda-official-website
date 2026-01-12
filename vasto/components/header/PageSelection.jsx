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
    <div className="flex gap-10">
        <ul className="flex gap-4">
          {content.header.links.map((item) => (
            <li key={item.url}>
              <Link
                href={item.url}
                className={`px-2.5 py-1.5 inline-flex items-center justify-center rounded-full text-center ${
                  pathname === item.url ? "bg-white shadow-md" : ""
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