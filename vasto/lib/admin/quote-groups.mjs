const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const genericNames = new Set(["cliente", "cliente final", "consumidor final", "empresa", "particular", ""]);
const hour = 60 * 60 * 1000;
const nif = (sale) => {
  const value = String(sale.nif || "").replace(/\D/g, "");
  return /^\d{9}$/.test(value) && !/^(\d)\1{8}$/.test(value) ? value : "";
};
const sameCustomer = (a, b) => {
  const first = nif(a), second = nif(b);
  if (first && second) return first === second;
  const name = normalize(a.customerName);
  return !genericNames.has(name) && name === normalize(b.customerName);
};

export function quoteFamily(sale) {
  // Prefer explicit metadata over filenames, which can be renamed by the user.
  const text = normalize(sale.quoteType || sale.quoteDetails || sale.orderDetails?.detalhes || sale.orderDetails?.details || sale.fileName);
  if (/bancad|workbench/.test(text)) return "Bancadas";
  if (/picking/.test(text)) return "Picking";
  if (/ligeir/.test(text)) return "Estantes ligeiras";
  if (/rack/.test(text)) return "Racks";
  return "Orçamentos";
}

function specifications(sale) {
  const details = normalize(sale.quoteDetails || sale.orderDetails?.detalhes || sale.orderDetails?.details);
  if (details) return details;
  const items = sale.orderDetails?.artigos;
  if (Array.isArray(items) && items.length) return JSON.stringify(items.map((item) => [normalize(item.produto), Number(item.unidades) || 0]).sort());
  return null;
}
function differentVersion(a, b) {
  const first = specifications(a), second = specifications(b);
  if (first && second) return first !== second;
  // Older PDFs have no specifications: different prices are only a fallback signal.
  return Number.isFinite(a.subtotal) && Number.isFinite(b.subtotal) && Math.round(a.subtotal * 100) !== Math.round(b.subtotal * 100);
}
const createdAt = (sale) => {
  const value = Date.parse(sale.quoteCreatedAt || sale.uploadedAt || "");
  return Number.isFinite(value) ? value : null;
};

// Presentation only. Anchor the whole group to one hour, avoiding chains across a day.
export function groupQuotes(sales) {
  const groups = [];
  const rank = new Map(sales.map((sale, index) => [sale.id, index]));
  for (const sale of [...sales].sort((a, b) => (createdAt(a) ?? Infinity) - (createdAt(b) ?? Infinity) || a.id.localeCompare(b.id))) {
    const family = quoteFamily(sale);
    const time = createdAt(sale);
    const project = normalize(sale.quoteProject);
    const eligible = sale.status === "em_preparacao" && sale.quoteSeparate !== true;
    const group = eligible && groups.find((candidate) => {
      if (!candidate.eligible || !candidate.sales.every((other) => sameCustomer(sale, other))) return false;
      if (project || candidate.project) return project && project === candidate.project;
      if (time === null || candidate.time === null || time - candidate.time > hour || family !== candidate.label) return false;
      // Uploaded legacy PDFs must also have the same issue date to avoid grouping a batch of old jobs.
      if ((!sale.quoteCreatedAt || !candidate.sales[0].quoteCreatedAt) && sale.issuedAt !== candidate.sales[0].issuedAt) return false;
      return candidate.sales.every((other) => differentVersion(sale, other));
    });
    if (group) group.sales.push(sale);
    else groups.push({ id: `versions:${sale.id}`, label: sale.quoteProject?.trim() || family, automatic: !project, project, time, eligible, sales: [sale] });
  }
  for (const group of groups) group.sales.sort((a, b) => rank.get(a.id) - rank.get(b.id));
  return groups.sort((a, b) => rank.get(a.sales[0].id) - rank.get(b.sales[0].id));
}
