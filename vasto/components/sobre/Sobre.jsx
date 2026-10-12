"use client";

import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";
import Image from "@/components/loadings/LoadingImage";

function StoryCard({ title, children, accent = "orange" }) {
  return (
    <article className="rounded-[28px] border border-[#e5e5e7] bg-white p-7 sm:p-9">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#86868b]">Vasto Império</span>
      <h2 className={`mt-5 text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-3xl ${accent === "blue" ? "text-(--blue)" : "text-(--orange)"}`}>{title}</h2>
      <p className="mt-4 text-base leading-7 text-[#626268] sm:text-lg">{children}</p>
    </article>
  );
}

function Sobre() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.sobreNos;

  return (
    <div className="overflow-hidden">
      <section className="bg-white px-5 pb-14 pt-[100px] sm:px-8 sm:pb-20 sm:pt-[112px] lg:pb-28 lg:pt-[128px]">
        <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-12">
          <div className="flex flex-col justify-center py-3 sm:py-8 lg:py-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{language === "pt" ? "Quem somos" : "About us"}</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">{item.title}</h1>
            <div className="mt-10 max-w-2xl space-y-7">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.035em] text-[#1d1d1f]">{item.p1t}</h2>
                <p className="mt-3 text-base leading-7 text-[#6e6e73] sm:text-lg">{item.p1}</p>
              </div>
              <div className="border-t border-[#e5e5e7] pt-6">
                <h2 className="text-xl font-semibold tracking-[-0.035em] text-[#1d1d1f]">{item.p2t}</h2>
                <p className="mt-3 text-base leading-7 text-[#6e6e73] sm:text-lg">{item.p2}</p>
              </div>
            </div>
          </div>
          <div className="relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-[32px] border border-[#e5e5e7] bg-[#f5f5f7] p-8 sm:min-h-[420px] lg:min-h-[600px]">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#eaf2ff] blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#fff0e8] blur-3xl" />
            <Image src={content.header.logo} alt="Vasto Império" width={720} height={320} priority className="relative z-10 h-auto w-full max-w-[480px] object-contain" />
            <div className="relative z-10 mt-5 flex items-baseline gap-3 rounded-full border border-[#e5e5e7] bg-white/90 px-6 py-3">
              <span className="text-4xl font-semibold tracking-[-0.06em] text-(--orange) sm:text-5xl">{item.vinte}</span>
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">{item.anos}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f7] px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-5 lg:grid-cols-2 lg:gap-6">
          <StoryCard title={item.p3t}>{item.p3}</StoryCard>
          <StoryCard title={item.p4t} accent="blue">{item.p4}</StoryCard>
        </div>
      </section>
    </div>
  );
}

export default Sobre;
