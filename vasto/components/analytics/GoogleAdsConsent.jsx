"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const STORAGE_KEY = "vasto-google-ads-consent-v1";
const TAG_ID = "AW-17959148068";

function updateConsent(accepted) {
  window.vastoAdsConsent = accepted;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (!window.vastoConsentInitialized) {
    window.gtag("consent", "default", {
      ad_storage: "denied", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    window.vastoConsentInitialized = true;
  }
  window.gtag("consent", "update", {
    ad_storage: accepted ? "granted" : "denied",
    ad_user_data: accepted ? "granted" : "denied",
    analytics_storage: "denied", ad_personalization: "denied",
  });
  if (accepted && !window.vastoAdsConfigured) {
    window.gtag("js", new Date());
    window.gtag("config", TAG_ID);
    window.vastoAdsConfigured = true;
  }
}

export default function GoogleAdsConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const privatePage = /^\/admin(?:\/|$)/.test(pathname) || pathname === "/orcamento/admin" || pathname === "/simulador/admin";

  useEffect(() => {
    let saved = null;
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (typeof value?.accepted === "boolean" && value.expires > Date.now()) saved = value.accepted;
    } catch { /* Missing or unavailable storage leaves measurement disabled. */ }
    updateConsent(saved === true);
    setChoice(saved);
    setReady(true);
  }, []);

  function choose(accepted) {
    updateConsent(accepted);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted, expires: Date.now() + 180 * 86400000 })); } catch { /* Keep the choice in memory. */ }
    setChoice(accepted);
    setOpen(false);
    // Unload the tag when consent is withdrawn.
    if (!accepted && document.getElementById("vasto-google-ads")) window.location.reload();
  }

  if (!ready || privatePage) return null;

  return (
    <>
      {choice === true && <Script id="vasto-google-ads" src={`https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`} strategy="afterInteractive" />}
      {choice === null || open ? (
        <section aria-labelledby="cookie-consent-title" className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-lg rounded-3xl border border-[#e5e5e7] bg-white p-6 shadow-[0_12px_60px_rgba(0,0,0,0.12)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[440px] sm:p-7">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#86868b]">A sua privacidade</p>
          <h2 id="cookie-consent-title" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">Preferências de cookies</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">Utilizamos cookies essenciais para o funcionamento do site. Com a sua autorização, usamos também cookies para avaliar os resultados dos nossos anúncios.</p>
          <p className="mt-2 text-xs leading-relaxed text-[#86868b]">Pode aceitar ou continuar apenas com os essenciais. A sua escolha pode ser alterada a qualquer momento.</p>
          <details className="mt-4 border-t border-[#efeff1] pt-3 text-xs leading-relaxed text-[#6e6e73]">
            <summary className="w-fit cursor-pointer rounded-sm py-1 font-medium text-[#1d1d1f] outline-offset-4 focus-visible:outline-2">Como utilizamos os cookies</summary>
            <p className="mt-3"><strong className="font-medium text-[#1d1d1f]">Essenciais.</strong> Permitem funcionalidades como guardar o carrinho e manter a sessão iniciada.</p>
            <p className="mt-2"><strong className="font-medium text-[#1d1d1f]">Publicidade, opcionais.</strong> Cookies do Google Ads que permitem medir os resultados dos anúncios, com partilha de dados de navegação com a Google. A personalização de anúncios permanece desativada.</p>
          </details>
          <div className="mt-5 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
            <button type="button" onClick={() => choose(false)} className="min-h-11 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-4 py-3 text-xs font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0879c0]">Apenas essenciais</button>
            <button type="button" onClick={() => choose(true)} className="min-h-11 cursor-pointer rounded-full border border-[#0879c0] bg-[#0879c0] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#06669f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0879c0]">Aceitar cookies</button>
          </div>
        </section>
      ) : <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-40 cursor-pointer rounded-full border border-[#e5e5e7] bg-white px-3.5 py-2 text-[11px] font-medium text-[#6e6e73] shadow-sm transition hover:bg-[#f5f5f7] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0879c0]">Preferências de cookies</button>}
    </>
  );
}
