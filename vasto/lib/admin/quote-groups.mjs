const normalizeName = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const normalize = normalizeName;
const nif = (sale) => {
  const value = String(sale.nif || "").replace(/\s+/g, "");
  return /^\d{9}$/.test(value) ? value : "";
};

export function sameQuoteCustomer(a, b) {
  const name = normalizeName(a.customerName);
  return Boolean((nif(a) && nif(a) === nif(b)) || (name && name === normalizeName(b.customerName)));
}

export function quoteFamily(sale) {
  // Prefer explicit metadata over filenames, which can be renamed by the user.
  const text = normalize(sale.quoteType || sale.quoteDetails || sale.orderDetails?.detalhes || sale.orderDetails?.details || sale.fileName);
  if (/bancad|workbench/.test(text)) return "Bancadas";
  if (/picking/.test(text)) return "Picking";
  if (/ligeir/.test(text)) return "Estantes ligeiras";
  if (/rack/.test(text)) return "Racks";
  return "Orçamentos";
}


// Only explicit, persisted membership groups records. No inference from dates or specs.
export function groupQuotes(sales) {
  const groups = new Map();
  for (const sale of sales) {
    const key = sale.quoteGroupId || `single:${sale.id}`;
    if (!groups.has(key)) groups.set(key, { id: key, label: "Versões", sales: [] });
    groups.get(key).sales.push(sale);
  }
  for (const group of groups.values()) group.sales.sort((a, b) => Number(b.status === "confirmada") - Number(a.status === "confirmada"));
  return [...groups.values()];
}
