"use client";

import styles from "./AdminNavigation.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoDocumentTextOutline, IoStatsChartOutline, IoConstructOutline, IoPieChartOutline, IoWalletOutline, IoChatbubblesOutline, IoSettingsOutline } from "react-icons/io5";

import AdminPreferences, { useAdminPreferences } from "./AdminPreferences";

import AdminChatUnread, { useAdminChatUnread } from "./AdminChatUnread";

import AdminSalesNotifications from "./AdminSalesNotifications";

const sections = [
  { href: "/admin", label: "Vendas", Icon: IoStatsChartOutline },
  { href: "/admin/estatisticas", label: "Estatísticas", Icon: IoPieChartOutline },
  { href: "/admin/comissoes", label: "Comissões", Icon: IoWalletOutline },
  { href: "/admin/orcamentos", label: "Orçamentos", Icon: IoDocumentTextOutline },
  { href: "/admin/simulador", label: "Simulador", Icon: IoConstructOutline },
  { href: "/admin/conversas", label: "Conversas", Icon: IoChatbubblesOutline },
  { href: "/admin/definicoes", label: "Definições", Icon: IoSettingsOutline },
];

export default function AdminNavigation({ children }) {
  return <AdminPreferences><AdminChatUnread><NavigationContent>{children}</NavigationContent></AdminChatUnread></AdminPreferences>;
}
function NavigationContent({ children }) {
  const { total } = useAdminChatUnread();
  const pathname = usePathname();
  const { theme } = useAdminPreferences();

  return (
    <div className={`${styles.shell} lg:grid`} data-admin-theme={theme}>
      <AdminSalesNotifications />
      <aside className={`${styles.sidebar} sticky top-0 z-40 border-b px-4 py-3 lg:flex lg:flex-col`}>
        <div className={`${styles.brandHeader} flex items-center justify-between gap-3`}>
          <Link href="/" aria-label="Ir para a página inicial da Vasto Império" className={`${styles.brand} flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-orange-300`}>
            <img src="/favicon-google.png" alt="" width="36" height="36" className="h-9 w-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Vasto Império</p>
              <p className="mt-0.5 text-[11px] text-[#86868b]">Área de administração</p>
            </div>
          </Link>
        </div>
        <nav aria-label="Administração" className="mt-3 flex gap-2 overflow-x-auto pb-0.5 lg:mt-10 lg:flex-col lg:overflow-visible">
          {sections.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-full px-3 py-2.5 text-sm transition lg:gap-3 lg:px-4 lg:py-3 ${
                  active
                    ? "border border-white/90 bg-white/80 font-semibold text-[#007aff] shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
                    : "border border-transparent text-[#6e6e73] hover:bg-white/55"
                }`}
              >
                <Icon className="text-lg" />{label}
                {href === '/admin/conversas' && total > 0 && <span className={styles.unreadBadge} role="status" aria-label={`${total} mensagens por ler`}>{total}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden pt-8 lg:block"><p className="px-4 text-[11px] leading-relaxed text-[#a1a1a6]">Vasto Império<br />Área de administração</p></div>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
