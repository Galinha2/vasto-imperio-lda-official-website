"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IoDocumentTextOutline, IoLogOutOutline, IoStatsChartOutline, IoConstructOutline, IoPieChartOutline, IoWalletOutline } from "react-icons/io5";

const sections = [
  { href: "/admin", label: "Vendas", Icon: IoStatsChartOutline },
  { href: "/admin/estatisticas", label: "Estatísticas", Icon: IoPieChartOutline },
  { href: "/admin/comissoes", label: "Comissões", Icon: IoWalletOutline },
  { href: "/admin/orcamentos", label: "Orçamentos", Icon: IoDocumentTextOutline },
  { href: "/admin/simulador", label: "Simulador", Icon: IoConstructOutline },
];

export default function AdminNavigation({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível terminar a sessão.");
      router.replace("/admin/login");
      router.refresh();
    } catch (failure) {
      setError(failure.message || "Não foi possível terminar a sessão.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-40 border-b border-[#e5e5e7] bg-white px-4 py-3 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Ir para a página inicial da Vasto Império" className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40">
            <img src="/favicon-google.png" alt="" width="36" height="36" className="h-9 w-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Vasto Império</p>
              <p className="mt-0.5 text-[11px] text-[#86868b]">Área de administração</p>
            </div>
          </Link>
          <button type="button" onClick={logout} className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-xs text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f] lg:hidden">
            <IoLogOutOutline className="text-base" /> Sair
          </button>
        </div>
        <nav aria-label="Administração" className="mt-3 flex gap-2 overflow-x-auto pb-0.5 lg:mt-10 lg:flex-col lg:overflow-visible">
          {sections.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition lg:gap-3 lg:px-4 lg:py-3 ${
                  active
                    ? "bg-[#edf4ff] font-semibold text-[#0071e3]"
                    : "text-[#6e6e73] hover:bg-[#f5f5f7]"
                }`}
              >
                <Icon className="text-lg" />{label}
              </Link>
            );
          })}
        </nav>
        {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
        <div className="mt-auto hidden lg:block">
          <p className="text-[11px] leading-relaxed text-[#a1a1a6]">Os seus documentos.<br />A sua visão do negócio.</p>
          <button type="button" onClick={logout} className="mt-6 flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2 text-sm text-[#86868b] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]">
            <IoLogOutOutline className="text-lg" />Terminar sessão
          </button>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
