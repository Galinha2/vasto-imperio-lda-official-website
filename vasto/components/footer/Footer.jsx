"use client";

import { useLanguage } from "@/components/header/LanguageContext";
import { usePathname } from "next/navigation";

function Footer() {
    const pathname = usePathname();
    const { language } = useLanguage();
    if (
        pathname === "/admin" ||
        pathname.startsWith("/admin/") ||
        pathname === "/orcamento/admin" ||
        pathname === "/simulador/admin"
    ) return null;
    return (
        <div className="site-footer z-1 bg-[var(--gray)] w-full p-5 text-center">
            <p>{language === "en" ? `© ${new Date().getFullYear()} Vasto Império. All rights reserved.` : `© ${new Date().getFullYear()} Vasto Império. Todos os direitos reservados.`}</p>
        </div>
    )
}

export default Footer
