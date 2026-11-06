// A line override replaces the default discount; transport is never discounted.
export function lineDiscount(line, fallback = 0) {
  return line.isPortes ? 0 : Number(line.discountPercent ?? fallback) || 0;
}
export function lineNet(line, fallback = 0) {
  return line.total * (1 - lineDiscount(line, fallback) / 100);
}
