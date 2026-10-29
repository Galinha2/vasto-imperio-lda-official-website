// Reforços centrais por nível (par de vigas) da família 3, comprimento em mm.
export function pickingCentralCount(length) {
  return Number(length) === 2750 ? 3 : Number(length) <= 2000 ? 1 : 2;
}
