"use client";

import StorageGuide from '@/components/commercial/StorageGuide';
import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

export default function Cards() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const cards = content.homeCards.text;

  return (
    <div>
      <section data-home-projects className="site-section bg-[#f5f5f7] px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1480px] space-y-5">
          {cards.map((card, index) => (
            <article key={card.pageTitle} className="site-glass grid overflow-hidden rounded-[30px] border border-[#e5e5e7] bg-white lg:min-h-[390px] lg:grid-cols-2">
              <div className={`relative min-h-[240px] bg-white ${index % 2 ? "lg:order-2" : ""}`}>
                {card.image && <Image src={card.image} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-top" />}
              </div>
              <div className="flex flex-col items-start justify-center p-7 sm:p-10 lg:p-14">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--orange)">{card.pageTitle}</p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#1d1d1f] sm:text-4xl">{card.title}</h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-[#6e6e73]">{card.subTitle}</p>
                {card.url && <div className="mt-7 flex flex-wrap items-center gap-3">
                  {card.url === "/orcamento" && <Link href="/simulador/estantes" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-(--orange) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--orange-hover)">{language === "pt" ? "Configurar e ver preço" : "Configure and see price"}<span aria-hidden="true">→</span></Link>}
                  <Link href={card.url} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#f0f1f6] px-5 py-3 text-sm font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-(--orange) hover:text-white">{card.url === "/orcamento" ? (language === "pt" ? "Pedir orçamento" : "Request a quotation") : card.button}<span aria-hidden="true">→</span></Link>
                </div>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <StorageGuide />
    </div>
  );
}
