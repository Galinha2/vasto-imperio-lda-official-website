"use client";

import Image from "@/components/loadings/LoadingImage";
import { useLanguage } from "../header/LanguageContext";

export default function ContactHeader() {
  const { language } = useLanguage();

  return (
    <section className="mx-auto mb-8 max-w-[1480px] px-5 sm:px-8 lg:mb-12 lg:px-12">
      <div className="relative isolate grid min-h-[360px] overflow-hidden rounded-[32px] border border-[#e5e5e7] bg-white sm:min-h-[420px] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative z-10 flex flex-col items-start justify-center p-7 sm:p-10 lg:p-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e6e73] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-(--orange)" />
            Vasto Império · Benedita e Viseu
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">
            {language === "pt" ? <>Estamos aqui para <span className="text-(--orange)">ajudar.</span></> : <>We are here to <span className="text-(--orange)">help.</span></>}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">
            {language === "pt"
              ? "Fale diretamente com a nossa equipa e encontre a solução certa para o seu espaço."
              : "Talk to our team and find the right solution for your space."}
          </p>
        </div>
        <div className="relative mx-5 flex min-h-[190px] items-end justify-center overflow-hidden px-8 sm:mx-8 sm:min-h-[230px] lg:m-0 lg:min-h-0 lg:justify-end lg:pr-16">
          <Image
            src="/phone.png"
            alt=""
            width={640}
            height={640}
            priority
            sizes="(max-width: 1024px) 70vw, 34vw"
            className="relative z-10 h-[220px] w-auto max-w-full self-end object-contain object-bottom sm:h-[270px] lg:h-[340px]"
          />
        </div>
      </div>
    </section>
  );
}
