const clean = (value) => String(value || "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
export function quoteTypeLabel(info = {}) {
  if (info.documentTypeLabel) return clean(info.documentTypeLabel);
  const explicit = String(info.quoteType || info.type || "").toLowerCase();
  const selected = { ligeiras: "Estantes Ligeiras", picking: "Estantes Picking", racks: "Racks para Paletes", bancadas: "Bancadas", workbench: "Bancadas" }[explicit];
  if (selected) return selected;
  const refs = (info.lines || info.quoteLines || info.orderDetails?.artigos || []).map((line) => String(line.refCompleta || ""));
  const text = [info.quoteDetails, info.details, info.orderDetails?.detalhes, info.fileName, ...(info.lines || info.quoteLines || info.orderDetails?.artigos || []).map((line) => `${line.produto || ""} ${line.refCompleta || ""}`)].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/bancad|workbench/.test(explicit || text)) return "Bancadas";
  const labels = [];
  if (explicit === "ligeiras" || (/ligeir|tabuleiro/.test(text) || refs.some((ref)=>/^1\.\d/.test(ref)))) labels.push("Estantes Ligeiras");
  if (explicit === "picking" || (/picking|viga z60|viga z100/.test(text) || refs.some((ref)=>/^3\.\d/.test(ref)))) labels.push("Estantes Picking");
  if (explicit === "racks" || (/racks|industrial/.test(text) || refs.some((ref)=>/^2\.\d/.test(ref)))) labels.push("Racks para Paletes");
  return labels.join(" e ") || (info.mergedQuoteIds?.length ? "Estantes - Conjunto" : "Vasto Império");
}
export function quoteFilename(info = {}, kind = "Orçamento", extension = "pdf", index) {
  const iso = String(info.issuedAt || info.date || new Intl.DateTimeFormat("en-CA", { timeZone:"Europe/Lisbon" }).format(new Date())).slice(0,10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("-") : "";
  const customer = clean(info.customerName || info.customer || "Cliente");
  return [clean(kind), clean(quoteTypeLabel(info)), customer, date, index ? String(index).padStart(2,"0") : ""].filter(Boolean).join(" - ") + "." + extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
