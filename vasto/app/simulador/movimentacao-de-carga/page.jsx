"use client";

import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import SimulatorSectionTabs from "@/components/simulador/SimulatorSectionTabs";
import { useLanguage } from "@/components/header/LanguageContext";

const options = [
  {
    id: "eletrico",
    title: "Porta-paletes elétrico",
    description: "Movimente cargas com assistência elétrica e menos esforço.",
    href: "/produtos/pt/porta-paletes-eletrico",
    image: "/produtos/5-porta-paletes-eletrico/i2.png",
    alt: "Porta-paletes elétrico",
    action: "Ver produto",
  },
  {
    id: "manual",
    title: "Porta-paletes manual",
    description: "Uma solução prática para transportar cargas no armazém.",
    href: "/produtos/pt/porta-paletes-manual",
    image: "/produtos/6-porta-paletes-manual/i1.png",
    alt: "Porta-paletes manual",
    action: "Ver produto",
  },
  {
    id: "stacker",
    title: "Stacker",
    description: "Peça-nos uma recomendação para elevar e movimentar as suas cargas.",
    href: "/orcamento",
    image: "/transport.png",
    alt: "Equipamentos de movimentação de carga, incluindo stacker",
    action: "Pedir informações",
  },
];

export default function LoadHandlingSimulatorPage() {
  const { language } = useLanguage();
  const english = language === "en";
  const translations = {
    eletrico: { title: "Electric pallet truck", description: "Move loads with electric assistance and less effort.", alt: "Electric pallet truck", action: "View product" },
    manual: { title: "Manual pallet truck", description: "A practical solution for moving loads around the warehouse.", alt: "Manual pallet truck", action: "View product" },
    stacker: { title: "Stacker", description: "Ask us for a recommendation to lift and move your loads.", alt: "Materials handling equipment, including a stacker", action: "Request information" },
  };
  const localizedOptions = options.map((option) => english
    ? { ...option, ...translations[option.id], href: option.href.replace("/pt/", "/en/") }
    : option);
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-5 pb-20 pt-[78px] sm:px-8 sm:pt-[84px] lg:px-12 lg:pt-[92px]">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-9 max-w-3xl sm:mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{english ? "Materials handling" : "Movimentação de carga"}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#1d1d1f] sm:text-5xl lg:text-6xl">
            {english ? "Choose the right equipment." : "Escolha o equipamento certo."}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">
            {english ? "Explore the available materials handling equipment and view product information." : "Explore os equipamentos de movimentação disponíveis e consulte as respetivas informações."}
          </p>
        </header>
        <SimulatorSectionTabs group="handling" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
          {localizedOptions.map((option) => (
            <Link
              key={option.id}
              href={option.href}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#e5e5e7] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.025)] transition duration-300 hover:-translate-y-1 hover:border-[#d7d8de] hover:shadow-[0_18px_40px_rgba(0,0,0,0.09)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--orange)"
            >
              <div className="relative h-56 bg-white sm:h-64">
                <Image src={option.image} alt={option.alt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" className="object-contain p-7 transition duration-500 group-hover:scale-[1.035] sm:p-8" />
              </div>
              <div className="border-t border-[#f0f0f2] px-5 py-5 sm:px-6 sm:py-6">
                <h2 className="text-xl font-semibold tracking-[-0.035em] text-[#1d1d1f] sm:text-2xl">{option.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6e6e73] sm:text-[15px]">{option.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-(--orange) transition group-hover:gap-3">
                  {option.action}<span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
