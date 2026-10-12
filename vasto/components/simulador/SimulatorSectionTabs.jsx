"use client";

import Link from "next/link";
import Image from "@/components/loadings/LoadingImage";
import { useLanguage } from "@/components/header/LanguageContext";

const tabs = {
  storage: [
    { id: "ligeiras", label: "Estantes ligeiras", href: "/simulador/estantes-ligeiras", image: "/prateleira inteira.png", alt: "Estante ligeira" },
    { id: "picking", label: "Picking", href: "/simulador/pt/estantes-picking", image: "/produtos/9-Porteco Z60/i1.png", alt: "Estante picking" },
    { id: "racks", label: "Racks", href: "/simulador/racks", image: "/recorte_DSC4798-1_c_laranja-2.png", alt: "Rack industrial" },
  ],
  handling: [
    { id: "eletrico", label: "Porta-paletes elétrico", href: "/produtos/pt/porta-paletes-eletrico" },
    { id: "manual", label: "Porta-paletes manual", href: "/produtos/pt/porta-paletes-manual" },
    { id: "stacker", label: "Stacker", href: "/orcamento" },
  ],
};

export default function SimulatorSectionTabs({ group = "storage", active, lang = "pt" }) {
  const { language } = useLanguage();
  lang = language || lang;
  const options = (tabs[group] ?? tabs.storage).map((option) => ({
    ...option,
    href: group === "handling" && option.id !== "stacker"
      ? `/produtos/${lang}/${option.id === "eletrico" ? "porta-paletes-eletrico" : "porta-paletes-manual"}`
      : option.id === "picking" ? `/simulador/${lang}/estantes-picking`
      : option.href,
    label: lang === "en"
      ? ({ ligeiras: "Light-duty shelving", picking: "Picking shelving", racks: "Pallet racking", eletrico: "Electric pallet truck", manual: "Manual pallet truck", stacker: "Stacker" }[option.id])
      : option.label,
  }));

  return (
    <nav
      aria-label={lang === "en" ? (group === "storage" ? "Shelving simulators" : "Materials handling equipment") : (group === "storage" ? "Simuladores de estantes" : "Equipamentos de movimentação de carga")}
      className="mt-3 mb-2 flex w-full max-w-full overflow-hidden rounded-full border border-[#e5e5e7] bg-white p-1 shadow-[0_1px_5px_rgba(0,0,0,0.025)] sm:inline-flex sm:w-fit"
    >
      <ul className="grid w-full min-w-0 grid-cols-3 items-stretch gap-0.5 sm:flex sm:w-auto sm:min-w-max sm:items-center">
        {options.map((option) => {
          const isActive = option.id === active;
          return (
            <li key={option.id} className="min-w-0">
              <Link
                href={option.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-1 py-1 text-center text-[11px] font-medium leading-tight transition-colors duration-200 sm:inline-flex sm:min-h-10 sm:w-auto sm:flex-row sm:gap-0 sm:px-0 sm:py-0 sm:text-[13px] ${option.image ? "sm:pl-2.5" : ""} ${
                  isActive
                    ? "bg-[#f5f5f7] text-[#1d1d1f]"
                    : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                }`}
              >
                {option.image && (
                  <span className="relative h-6 w-6 shrink-0 overflow-hidden sm:h-9 sm:w-9">
                    <Image
                      src={option.image}
                      alt={option.alt}
                      fill
                      sizes="36px"
                      className="object-contain p-1 mix-blend-multiply"
                    />
                  </span>
                )}
                <span className={`min-w-0 px-1 sm:px-3.5 ${option.image ? "sm:pl-2.5" : ""}`}>{option.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
