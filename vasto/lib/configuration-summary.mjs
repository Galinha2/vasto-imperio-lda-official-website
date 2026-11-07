export const ESTIMATE_VAT_RATE = 0.23; // Illustrative mainland Portugal rate; final taxation is confirmed with the proposal.
export function configurationDimensions(requestedMetres, effectiveMillimetres, rows = 1) {
  const requested = Number(String(requestedMetres).replace(',', '.'));
  const effective = effectiveMillimetres / 1000;
  const valid = Number.isFinite(requested) && requested > 0 && Number.isFinite(effective) && effective > 0;
  return { requested, effective, valid, difference: valid ? Math.round((effective - requested) * 1000) / 1000 : 0, total: effectiveMillimetres * rows / 1000 };
}
export function configurationReference(quote) {
  if (/^VI-CFG-[A-F0-9]{8}$/.test(quote.reference || "")) return quote.reference;
  const value = JSON.stringify([quote.simulatorType, quote.configuration, quote.items, quote.discountPercent, quote.total, quote.details]);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `VI-CFG-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}
export function estimatedTax(total) {
  const net = Math.round(total * 100) / 100;
  const vat = Math.round(net * ESTIMATE_VAT_RATE * 100) / 100;
  return { net, vat, gross: Math.round((net + vat) * 100) / 100 };
}
export const capacityConditions = {
  pt: 'Valor de catálogo para carga uniformemente distribuída por tabuleiro ou par de vigas, conforme indicado. Não representa a capacidade total da estante. Medidas, vãos, níveis, tampos, reforços, estabilidade, piso e fixações influenciam a capacidade; cargas pontuais e a configuração final exigem validação técnica.',
  en: 'Catalogue value for an evenly distributed load per shelf or beam pair, as stated. It is not the total bay capacity. Dimensions, spans, levels, decks, reinforcements, stability, floor and anchoring affect capacity; concentrated loads and the final configuration require technical validation.',
};
