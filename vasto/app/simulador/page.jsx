"use client";

import Image from "@/components/loadings/LoadingImage";
import Link from "next/link";
import { useLanguage } from "@/components/header/LanguageContext";

const shelvingOptions = [
  {
    title: "Estantes ligeiras",
    description: "Uma solução flexível para arrumação manual e cargas ligeiras.",
    href: "/simulador/estantes-ligeiras",
    image: "/prateleira inteira.png",
    imageAlt: "Estante metálica de carga ligeira",
    tag: "Carga ligeira",
  },
  {
    title: "Estantes picking",
    description: "Configure níveis, profundidade e acabamento para picking.",
    href: "/simulador/pt/estantes-picking",
    image: "/produtos/9-Porteco Z60/i1.png",
    imageAlt: "Estante picking com prateleiras",
    tag: "Carga média",
  },
  {
    title: "Racks para paletes",
    description: "Dimensione uma estrutura robusta para armazenagem paletizada.",
    href: "/simulador/racks",
    image: "/recorte_DSC4798-1_c_laranja-2.png",
    imageAlt: "Rack industrial para paletes",
    tag: "Carga pesada",
  },
];

const handlingOptions = [
  {
    title: "Porta-paletes elétrico",
    description: "Movimente cargas com assistência elétrica e menos esforço.",
    href: "/produtos/pt/porta-paletes-eletrico",
    image: "/produtos/5-porta-paletes-eletrico/i2.png",
    imageAlt: "Porta-paletes elétrico",
    action: "Ver produto",
  },
  {
    title: "Porta-paletes manual",
    description: "Uma solução prática para transportar cargas no armazém.",
    href: "/produtos/pt/porta-paletes-manual",
    image: "/produtos/6-porta-paletes-manual/i1.png",
    imageAlt: "Porta-paletes manual",
    action: "Ver produto",
  },
  {
    title: "Stacker",
    description: "Precisa de um stacker? Peça-nos uma solução adequada à sua operação.",
    href: "/produtos/pt/stacker",
    image: "/produtos/2-Stacker/stacker-branco.png",
    imageAlt: "Stacker",
    action: "Ver produto",
  },
];

function OptionCard({ option, equipment = false, english = false }) {
  return (
    <Link
      href={option.href}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-[#e5e5e7] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.025)] transition duration-300 hover:-translate-y-1 hover:border-[#d7d8de] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--orange)"
    >
      <div className={`relative flex items-center justify-center bg-white ${equipment ? "h-48 p-6 sm:h-56" : "h-48 p-5 sm:h-56"}`}>
        <Image
          src={option.image}
          alt={option.imageAlt}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
          className={`object-contain p-6 transition duration-500 group-hover:scale-[1.035] ${equipment ? "sm:p-8" : "sm:p-7"}`}
        />
        {!equipment && (
          <span className="absolute left-5 top-5 z-10 rounded-full bg-[#f5f5f7]/95 px-3.5 py-1.5 text-xs font-semibold text-[#6e6e73] backdrop-blur">
            {option.tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 border-t border-[#f0f0f2] px-5 py-5 sm:px-6 sm:py-6">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold tracking-[-0.035em] text-[#1d1d1f] sm:text-[22px]">
            {option.title}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6e6e73] sm:text-[15px]">
            {option.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-(--orange) transition group-hover:gap-3">
            {option.action ?? (english ? "Configure shelving" : "Configurar estante")}
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SimulatorSelectionPage() {
  const { language } = useLanguage();
  const english = language === "en";
  const translations = {
    "Estantes ligeiras": ["Light-duty shelving", "A flexible solution for manual storage and light loads.", "Light loads", "Light-duty metal shelving"],
    "Estantes picking": ["Picking shelving", "Configure the levels, depth and finish for picking.", "Medium loads", "Picking shelving with shelves"],
    "Racks para paletes": ["Pallet racking", "Configure a robust structure for pallet storage.", "Heavy loads", "Industrial pallet rack"],
    "Porta-paletes elétrico": ["Electric pallet truck", "Move loads with electric assistance and less effort.", "", "Electric pallet truck", "View product"],
    "Porta-paletes manual": ["Manual pallet truck", "A practical solution for moving loads around the warehouse.", "", "Manual pallet truck", "View product"],
    Stacker: ["Stacker", "Need a stacker? Ask us for a solution suited to your operation.", "", "Stacker", "View product"],
  };
  const translateOption = (option) => {
    if (!english || !translations[option.title]) return option;
    const [title, description, tag, imageAlt, action] = translations[option.title];
    const href = option.title === "Estantes picking"
      ? "/simulador/en/estantes-picking"
      : option.href.replace("/pt/", "/en/");
    return { ...option, href, title, description, tag, imageAlt, action: action ?? option.action };
  };
  const localizedShelving = shelvingOptions.map(translateOption);
  const localizedHandling = handlingOptions.map(translateOption);
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-5 pb-20 pt-[88px] sm:px-8 sm:pt-[104px] lg:px-12 lg:pt-[120px]">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-10 max-w-4xl sm:mb-14">
          <p className="inline-flex rounded-full border border-[#e5e5e7] bg-white px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-(--orange)">
            {english ? "Quote simulator" : "Simulador de orçamento"}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#1d1d1f] sm:text-5xl lg:text-[60px]">
            {english ? "Choose what you want to configure." : "Escolha o que pretende configurar."}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">
            {english ? "Configure a storage solution or find the right materials handling equipment." : "Simule uma solução de armazenagem ou encontre o equipamento de movimentação de cargas adequado."}
          </p>
        </header>

        <section aria-labelledby="shelving-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[#dedee2] pb-4 sm:mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--orange)">{english ? "Configure your storage" : "Configure a sua armazenagem"}</p>
              <h2 id="shelving-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-3xl">
                {english ? "Shelving simulators" : "Simuladores de estantes"}
              </h2>
            </div>
            <span className="text-sm text-[#86868b]">{english ? "Choose one to start configuring" : "Escolha uma opção para começar"}</span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {localizedShelving.map((option) => <OptionCard key={option.title} option={option} english={english} />)}
          </div>
        </section>

        <section aria-labelledby="handling-heading" className="mt-14 border-t border-[#dedee2] pt-10 sm:mt-16 sm:pt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[#dedee2] pb-4 sm:mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--orange)">{english ? "Move your loads" : "Movimente as suas cargas"}</p>
              <h2 id="handling-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-3xl">
                {english ? "Materials handling equipment" : "Equipamentos de carga"}
              </h2>
            </div>
            <Link href="/produtos" className="text-sm font-semibold text-(--orange) hover:underline">
              {english ? "View all products" : "Ver todos os produtos"} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {localizedHandling.map((option) => <OptionCard key={option.title} option={option} equipment english={english} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
