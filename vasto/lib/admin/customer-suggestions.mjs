const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export function customerSuggestions(sales, query, field = "name") {
  const prefix = normalize(query);
  if (!prefix || (field !== "nif" && prefix.length < 2)) return [];
  const customers = new Map();
  for (const sale of [...sales].sort((a,b) => String(b.updatedAt || b.uploadedAt || "").localeCompare(String(a.updatedAt || a.uploadedAt || "")))) {
    const name = String(sale.customerName || "").trim();
    const nif = /^\d{9}$/.test(sale.nif || "") ? sale.nif : "";
    if (!name || ["cliente", "nif nao encontrado"].includes(normalize(name))) continue;
    const key = nif || normalize(name);
    const details = sale.orderDetails || {};
    const customer = { name, nif, address: details.moradaFiscal || "", email: details.email || "", phone: details.telefone || sale.customerPhone || "" };
    const existing = customers.get(key);
    if (!existing) customers.set(key, customer);
    else { existing.address ||= customer.address; existing.email ||= customer.email; existing.phone ||= customer.phone; }
  }
  return [...customers.values()].filter((customer) => normalize(field === "nif" ? customer.nif : customer.name).startsWith(prefix)).slice(0, 8);
}
