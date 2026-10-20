"use client";

import { TbTruckDelivery } from "react-icons/tb";
import { FaMapMarkedAlt } from "react-icons/fa";
import { MdOutlineWorkspacePremium } from "react-icons/md";
import { FaRankingStar } from "react-icons/fa6";
import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";

const iconMap = { TbTruckDelivery, FaMapMarkedAlt, MdOutlineWorkspacePremium, FaRankingStar };
const cardAccents = [
  { icon: "bg-[#fff0e8] text-[#f05a1a]", hover: "hover:border-[#ffd2bd]" },
  { icon: "bg-[#eaf2ff] text-[#3478d4]", hover: "hover:border-[#c9dcff]" },
  { icon: "bg-[#e9f7ef] text-[#278456]", hover: "hover:border-[#bde8ce]" },
  { icon: "bg-[#f1edff] text-[#7653c8]", hover: "hover:border-[#d8ccff]" },
];

export default function InfoIconsCards() {
  const { language } = useLanguage();
  const { title, text: items } = (language === "pt" ? contentpt : contenten).homeInfoCards;

  return (
    <aside className="site-glass site-glass-cool rounded-[28px] border border-[#e5e5e7] bg-[#f5f5f7] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.035)] sm:p-6 lg:mt-[132px] lg:self-start">
      <div className="border-b border-[#e2e2e5] pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{language === "pt" ? "Porquê a Vasto Império" : "Why Vasto Império"}</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#1d1d1f]">{title}</h2>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((card, index) => {
          const Icon = iconMap[card.icon];
          const accent = cardAccents[index % cardAccents.length];
          return (
            <article key={card.title} className={`site-glass group flex items-start gap-3.5 rounded-[20px] border border-[#e8e8eb] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.025)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,0,0,0.07)] ${accent.hover}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition-transform duration-300 group-hover:scale-110 ${accent.icon}`}>
                {Icon && <Icon className="text-[21px]" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-snug tracking-[-0.01em] text-[#1d1d1f]">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-[1.55] text-[#68686e] sm:text-[13px]">{card.subTitle}</p>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
