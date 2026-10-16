export function pickingDiscountRate(subtotal) {
  return subtotal >= 1850 ? 0.15 : subtotal >= 1250 ? 0.10 : subtotal > 550 ? 0.05 : 0;
}
