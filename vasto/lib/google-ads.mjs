const SIMULATOR_CONVERSION = "AW-17959148068/TouCCJL1zZwdEKS0y_NC";

// Called only after the order endpoint confirms success. Never send customer data.
export function trackSimulatorOrder() {
  if (typeof window === "undefined" || window.vastoAdsConsent !== true || typeof window.gtag !== "function") return;
  if (/^\/(?:admin(?:\/|$)|orcamento\/admin(?:\/|$)|simulador\/admin(?:\/|$))/.test(window.location.pathname)) return;
  try {
    window.gtag("event", "conversion", { send_to: SIMULATOR_CONVERSION });
  } catch { /* Measurement must never interrupt a successful order. */ }
}
