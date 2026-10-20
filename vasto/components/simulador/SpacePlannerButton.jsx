"use client";

import Link from "next/link";
import { IoGridOutline, IoReorderThreeOutline } from "react-icons/io5";
import { useLanguage } from "@/components/header/LanguageContext";

export const simulatorPaths = { ligeiras: "/admin/simulador", picking: "/admin/simulador", racks: "/admin/simulador" };

export default function SpacePlannerButton({ type, children, disabled = false, activeView = "front" }) {
  const { language } = useLanguage();
  if (disabled) return children;
  const english = language === "en";
  return <div className="mx-auto max-w-[1800px]">
    <nav className="site-glass mb-5 mt-2 inline-flex max-w-full flex-wrap gap-1 rounded-[28px] border border-[#e5e5e7] bg-white p-1" aria-label={english ? "Simulator mode" : "Modo de simulação"}>
      {[{ id: "front", href: simulatorPaths[type], label: english ? "Configure a row · 2D" : "Configurar uma fila · 2D", Icon: IoReorderThreeOutline }, { id: "space", href: `/admin/simulador/espaco/${type}`, label: english ? "Plan with room dimensions" : "Planear com as medidas do espaço", Icon: IoGridOutline }].map(({ id, href, label, Icon }) => <Link key={id} href={href} aria-current={activeView === id ? "page" : undefined} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-semibold transition sm:text-sm ${activeView === id ? "bg-orange-50 text-orange-700" : "text-[#6e6e73] hover:bg-[#f5f5f7]"}`}><Icon className="shrink-0 text-lg" />{label}</Link>)}
    </nav>
    {children}
  </div>;
}
