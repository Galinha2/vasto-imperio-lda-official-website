import { hasCustomerName } from "../customer-identity.mjs";
import { sameQuoteCustomer } from "./quote-groups.mjs";
export const noteCategories = ['geral', 'contactos', 'seguimento'];
export function validateCustomerNote(input) {
  if (!input || typeof input.text !== 'string' || !input.text.trim() || input.text.trim().length > 3000 || !noteCategories.includes(input.category)) throw Object.assign(new Error('Escreva uma nota com até 3000 caracteres e escolha um separador válido.'), { status: 400 });
  const followUpDate = input.followUpDate || '';
  if (followUpDate && (!/^\d{4}-\d{2}-\d{2}$/.test(followUpDate) || !Number.isFinite(Date.parse(`${followUpDate}T12:00:00Z`)) || new Date(`${followUpDate}T12:00:00Z`).toISOString().slice(0, 10) !== followUpDate)) throw Object.assign(new Error('Indique uma data válida para voltar a contactar o cliente.'), { status: 400 });
  return { text: input.text.trim(), category: input.category, followUpDate };
}

export function sameNotesCustomer(a, b) {
  if (a.id === b.id) return true;
  if (/^\d{9}$/.test(a.nif || "") && a.nif === b.nif) return true;
  return hasCustomerName(a.customerName) && hasCustomerName(b.customerName) && sameQuoteCustomer(a, b);
}
