export const CART_LIMIT = 10;
export function validCartEntry(entry) {
  return !!entry && typeof entry.id === 'string' && typeof entry.label === 'string' && typeof entry.details === 'string'
    && Number.isSafeInteger(entry.quantity) && entry.quantity >= 1
    && (entry.baseQuantity === undefined || (Number.isSafeInteger(entry.baseQuantity) && entry.baseQuantity >= 1))
    && Number.isFinite(entry.discountPercent) && entry.discountPercent >= 0 && entry.discountPercent <= 100
    && typeof entry.image === 'string' && /^data:image\/jpeg;base64,/.test(entry.image) && entry.image.length <= 350000
    && Array.isArray(entry.items) && entry.items.length > 0 && entry.items.length <= 100
    && entry.items.every(line => typeof line.produto === 'string' && Number.isFinite(line.preco) && line.preco >= 0 && Number.isFinite(line.unidades) && line.unidades > 0 && Number.isFinite(line.total) && line.total >= 0);
}
export function cartQuote(entries) {
  const items = entries.flatMap((entry, index) => entry.items.map(line => {
    const multiplier = entry.quantity / (entry.baseQuantity || 1);
    const units = Math.round(line.unidades * multiplier * 1e8) / 1e8;
    const rate = line.isPortes ? 1 : 1 - entry.discountPercent / 100;
    const total = Math.round(line.total * multiplier * rate * 100) / 100;
    return { ...line, produto: `${index + 1}. ${entry.label} · ${line.produto}`, unidades: units, preco: total / units, total };
  }));
  return {
    items, discountPercent: 0,
    total: Math.round(items.reduce((sum, line) => sum + line.total, 0) * 100) / 100,
    details: entries.map((entry, index) => `${index + 1}. ${entry.label} · ${entry.quantity} ${entry.baseQuantity ? "estante(s) / fila(s)" : "configuração(ões)"}\n${entry.baseQuantity ? `Simulação original: ${entry.baseQuantity} fila(s). ` : ""}${entry.details}`).join('\n\n'),
  };
}

export function normalizeCartEntry(entry) {
  if (!entry || entry.baseQuantity !== undefined) return entry;
  const rows = Number(entry.details?.match(/Linhas de estantes lado a lado:\s*(\d+)/)?.[1]);
  return rows > 0 ? { ...entry, baseQuantity: rows, quantity: entry.quantity * rows } : entry;
}

export function cartEntryTitle(entry) {
  if (entry.configuration?.kind === 'space' || entry.label.startsWith('Planeamento')) return entry.label;
  const metric = label => {
    const value = entry.details.match(new RegExp(`${label}:\\s*([\\d.,]+)\\s*m`))?.[1];
    if (!value) return NaN;
    return Math.round(Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value) * 1000);
  };
  const height = metric('Altura') || entry.configuration?.height;
  const length = metric('Comprimento por fila');
  const depth = metric('Profundidade') || entry.configuration?.depth;
  if (![height, length, depth].every(value => Number.isFinite(value) && value > 0)) return entry.label;
  const label = entry.label === 'Picking' ? 'Estante picking' : entry.label;
  return `${label} - ${height}x${length}x${depth} mm`;
}
