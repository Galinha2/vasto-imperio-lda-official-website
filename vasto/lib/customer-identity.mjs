export function hasCustomerName(name) {
  const value = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return !!value && !["cliente", "ciente", "nif nao encontrado", "nao encontrado"].includes(value);
}
export function resolveCustomerName(company, manual) {
  return hasCustomerName(company?.nome) ? company.nome.trim() : hasCustomerName(manual) ? manual.trim() : "Cliente";
}
