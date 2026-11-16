const storageKey = "vasto-admin-sale-update";

export function notifySaleSaved(sale) {
  window.dispatchEvent(new CustomEvent("admin:sales-changed", { detail: { sale } }));
  // Other open sales tabs only need the ID to fetch the latest protected record.
  try { localStorage.setItem(storageKey, JSON.stringify({ id: sale.id, revision: sale.quoteRevision || 0, at: Date.now() })); }
  catch { /* Saving remains successful if browser storage is unavailable. */ }
}

export function subscribeSaleUpdates(onSaved, onExternal) {
  const saved = event => { if (event.detail?.sale) onSaved(event.detail.sale); };
  const external = event => {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue);
      if (/^[a-f0-9]{64}$/.test(data.id)) onExternal(data.id);
    } catch { /* Ignore unrelated or malformed browser data. */ }
  };
  window.addEventListener("admin:sales-changed", saved);
  window.addEventListener("storage", external);
  return () => {
    window.removeEventListener("admin:sales-changed", saved);
    window.removeEventListener("storage", external);
  };
}
