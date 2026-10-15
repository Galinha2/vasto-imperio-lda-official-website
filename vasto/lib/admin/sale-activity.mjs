export function lastSaleActivity(sale) {
  for (const value of [sale.updatedAt, sale.uploadedAt, sale.issuedAt && `${sale.issuedAt}T12:00:00Z`]) {
    const time = typeof value === "string" ? Date.parse(value) : NaN;
    if (Number.isFinite(time)) return time;
  }
  return null;
}

export function isSaleInactive(sale, now = Date.now()) {
  const activity = lastSaleActivity(sale);
  return activity !== null && now - activity > 7 * 24 * 60 * 60 * 1000;
}
