"use client";

import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

export default function SimulatorCard() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const { title, text: items } = content.simulationCards;

  return (
    <div className="min-w-0 lg:flex lg:h-full lg:flex-col">
      <div className="mb-7 border-b border-[#e5e5e7] pb-5 sm:mb-8 sm:pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">
          {language === "pt" ? "Planeie com confiança" : "Plan with confidence"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">{title}</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:flex-1">
        {items.map((item) => (
          <article key={item.title} className="site-glass group flex min-h-[510px] flex-col overflow-hidden rounded-[28px] border border-[#e2e3e8] bg-[#f0f1f6] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.035)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.09)] sm:p-4 lg:h-full">
          <div className="site-glass relative flex h-[280px] shrink-0 items-center justify-center overflow-hidden rounded-[21px] border border-transparent bg-transparent sm:h-[320px]">
              <Image src={item.image} alt="" fill sizes="(max-width: 640px) 90vw, 460px" className="object-contain p-2 transition duration-500 group-hover:scale-[1.035]" />
            </div>
            <div className="flex flex-1 flex-col items-start px-2 pb-2 pt-5 sm:px-3 sm:pt-6">
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.025em] text-[#1d1d1f]">{item.title}</h3>
                <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#626268]">
                  {item.subTitle?.map((line) => <li key={line.text} className="flex items-start gap-2.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-(--orange)" /><span>{line.text}</span></li>)}
                </ul>
              </div>
              <Link href={item.url} className="mt-auto inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-(--orange) px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(255,85,0,0.18)] transition duration-200 hover:bg-(--orange-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--orange)">
                {item.simulation}<span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
