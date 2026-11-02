const historicalCutoff = '2026-09-01';

export function usesHistoricalDeliveryPeriod(sale) {
  return typeof sale.issuedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(sale.issuedAt)
    && sale.issuedAt < historicalCutoff;
}

export function salePeriodDate(sale) {
  if (sale.status === 'em_preparacao') return sale.issuedAt;
  if (sale.periodDateOverride) return sale.periodDateOverride;
  // Exceção histórica: apenas orçamentos emitidos antes de setembro de 2026.
  if (usesHistoricalDeliveryPeriod(sale) && sale.deliveryStatus === 'entregue' && sale.deliveryDate) return sale.deliveryDate;
  return sale.saleDate || sale.issuedAt;
}
