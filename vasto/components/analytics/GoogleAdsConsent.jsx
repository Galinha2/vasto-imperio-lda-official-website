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
        <section aria-label="Preferências de medição publicitária" className="site-section site-glass fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-[#e5e5e7] bg-white p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-[#1d1d1f]">Medição dos anúncios</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">Podemos usar cookies do Google Ads e partilhar dados de navegação com a Google para medir os resultados dos nossos anúncios. A personalização de anúncios fica desativada. Pode recusar e continuar a usar o site, ou alterar a escolha em “Cookies de publicidade”.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => choose(false)} className="rounded-full border border-[#0879c0] px-5 py-2 text-sm font-medium text-[#0879c0] focus-visible:outline-2 focus-visible:outline-offset-2">Recusar</button>
            <button type="button" onClick={() => choose(true)} className="rounded-full border border-[#0879c0] bg-[#0879c0] px-5 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2">Aceitar medição</button>
          </div>
        </section>
      ) : <button type="button" onClick={() => setOpen(true)} className="fixed bottom-2 left-2 z-40 rounded-full border border-[#e5e5e7] bg-white px-3 py-1.5 text-[11px] text-[#6e6e73] shadow-sm">Cookies de publicidade</button>}
    </>
  );
}
