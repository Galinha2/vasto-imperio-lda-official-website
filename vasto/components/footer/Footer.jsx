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
        <footer className="site-footer z-1 bg-[var(--gray)] w-full p-5 text-center">
            <nav aria-label={language === "en" ? "Legal information" : "Informações legais"} className="mb-4 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-7">
                {[
                    { label: "Política de Privacidade e Cookies", href: "/politica-de-privacidade-e-cookies" },
                    { label: "Termos e Condições Gerais", href: "/termos-e-condicoes-gerais" },
                    { label: "Livro de Reclamações", href: "https://www.livroreclamacoes.pt/inicio" },
                ].map(({ label, href }) => (
                    <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="rounded-sm py-1 font-medium underline-offset-4 transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
                        {label}
                    </a>
                ))}
            </nav>
            <p>{language === "en" ? `© ${new Date().getFullYear()} Vasto Império. All rights reserved.` : `© ${new Date().getFullYear()} Vasto Império. Todos os direitos reservados.`}</p>
        </footer>
    )
}

export default Footer
