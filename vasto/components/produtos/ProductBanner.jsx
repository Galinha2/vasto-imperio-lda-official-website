"use client";

import Image from "@/components/loadings/LoadingImage";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

export default function ProductBanner() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;

  return (
    <section className="product-hero relative isolate overflow-hidden border-b border-[#dedee3] bg-white">
      <Image
        src={content.productBanner.background}
        alt=""
        fill
        priority
        sizes="100vw"
        className="product-hero-background z-0 object-cover object-center opacity-35"
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-white via-white/90 to-white/65" />
      <div className="product-hero-content relative z-20 mx-auto grid min-h-[520px] max-w-[1440px] items-center gap-8 px-5 py-14 sm:px-8 lg:min-h-[590px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-4 lg:px-12 lg:pb-0 lg:pt-16">
        <div className="relative z-10 max-w-xl lg:self-center lg:pb-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/75 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#555860] shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-(--orange)" />
            {language === "pt" ? "Vasto Império · Soluções de armazenagem" : "Vasto Império · Storage solutions"}
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">
            {language === "pt" ? <>Soluções feitas para <span className="text-(--orange)">organizar melhor.</span></> : <>Storage designed to <span className="text-(--orange)">work better.</span></>}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#626268] sm:text-lg">
            {language === "pt"
              ? "Explore sistemas profissionais para armazéns, oficinas, lojas e espaços de trabalho."
              : "Explore professional systems for warehouses, workshops, shops and workplaces."}
          </p>
          <p className="mt-7 text-sm font-medium text-[#777980]">
            {language === "pt" ? "Descubra a solução certa para o seu espaço." : "Find the right solution for your space."}
          </p>
        </div>

        <div className="product-hero-art relative mx-auto flex w-full max-w-[820px] items-end lg:h-full lg:self-end">
          <div className="absolute inset-x-10 bottom-8 top-12 rounded-full bg-white/70 blur-3xl" />
          <Image
            src={content.productBanner.tools}
            alt={language === "pt" ? "Seleção de soluções de armazenagem Vasto Império" : "A selection of Vasto Império storage solutions"}
            width={2000}
            height={673}
            priority
            sizes="(max-width: 1024px) 95vw, 58vw"
            className="product-hero-product-image relative z-10 h-auto w-full object-contain object-bottom drop-shadow-[0_22px_26px_rgba(35,45,60,0.12)] lg:mt-auto"
          />
        </div>
      </div>
    </section>
  );
}
