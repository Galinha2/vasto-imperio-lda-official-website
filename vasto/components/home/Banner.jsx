"use client";

import Image from "next/image";
import Link from "next/link";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

export default function Banner() {
  const { language } = useLanguage();
  const content = language === "pt" ? contentpt : contenten;
  const item = content.homeHeader.text[0];
  const titleParts = item.title.match(/^([\s\S]*?)<span[^>]*>([\s\S]*?)<\/span>([\s\S]*)$/);
  const plainTitle = item.title.replace(/<[^>]*>/g, "");

  return (
    <section className="relative isolate mt-[68px] overflow-hidden bg-[#f5f5f7] lg:mt-[76px]">
      <Image
        src={content.homeHeader.background}
        alt=""
        fill
        priority
        sizes="100vw"
        className="z-0 object-cover object-center"
      />
      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(248,249,251,0.98)_0%,rgba(248,249,251,0.88)_46%,rgba(248,249,251,0.24)_100%)]" />
      <div className="relative z-20 mx-auto grid min-h-[620px] max-w-[1440px] items-center gap-8 px-5 py-14 sm:px-8 lg:min-h-[700px] lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-4 lg:px-12 lg:pb-0 lg:pt-20">
        <div className="relative z-10 max-w-3xl lg:self-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#52545a] shadow-sm backdrop-blur-md sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-(--orange)" />
            Vasto Império · Benedita e Viseu
          </p>
          <h1
            className="max-w-3xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] text-[#15171a] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {titleParts ? <>{titleParts[1]}<span className="bg-gradient-to-r from-(--blue) to-(--orange) bg-clip-text text-transparent">{titleParts[2]}</span>{titleParts[3]}</> : plainTitle}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#555b63] sm:text-xl">
            {item.subTitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={item.url}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-(--orange) px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,85,0,0.22)] transition hover:-translate-y-0.5 hover:bg-(--orange-hover) hover:shadow-lg"
            >
              {item.button}<span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/simulador"
              className="inline-flex cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/80 px-6 py-3.5 text-sm font-semibold text-[#25282d] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
            >
              {content.simulationCards.title}
            </Link>
          </div>
          <p className="mt-7 text-sm font-medium text-[#737880]">{language === "pt" ? "Soluções para armazenagem profissional em todo o país." : "Professional storage solutions across Portugal."}</p>
        </div>
        <div className="relative mx-auto flex w-full max-w-[680px] items-end justify-center lg:-mr-8 lg:justify-end lg:self-end">
          <div className="absolute inset-x-8 bottom-8 top-8 rounded-full bg-white/55 blur-3xl" />
          <Image
            src={content.homeHeader.tools}
            alt={language === "pt" ? "Equipamento de armazenagem da Vasto Império" : "Vasto Império storage equipment"}
            width={1200}
            height={700}
            priority
            sizes="(max-width: 1024px) 90vw, 52vw"
            className="relative z-10 h-auto max-h-[420px] w-full object-contain object-bottom drop-shadow-[0_28px_35px_rgba(35,45,60,0.18)] lg:max-h-[520px]"
          />
        </div>
      </div>
    </section>
  );
}
