"use client";

import { useLanguage } from "@/components/header/LanguageContext";

function Footer() {
    const { language } = useLanguage();
    return (
        <div className="z-1 bg-[var(--gray)] w-full p-5 text-center">
            <p>{language === "en" ? `© ${new Date().getFullYear()} Vasto Império. All rights reserved.` : `© ${new Date().getFullYear()} Vasto Império. Todos os direitos reservados.`}</p>
        </div>
    )
}

export default Footer
