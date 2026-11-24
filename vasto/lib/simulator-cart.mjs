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
  const grouped = new Map();
  for (const entry of entries) for (const line of entry.items) {
    const multiplier = entry.quantity / (entry.baseQuantity || 1);
    const units = Math.round(line.unidades * multiplier * 1e8) / 1e8;
    const total = Math.round(line.total * multiplier * 100) / 100;
    const discountPercent = line.isPortes ? 0 : entry.discountPercent;
    const netTotal = Math.round(total * (1 - discountPercent / 100) * 100) / 100;
    const name = line.produto.normalize('NFC').trim().replace(/\s+/g, ' ');
    // Do not turn a discounted price into a new catalogue price. A separate
    // line is retained only where the same article genuinely has a different
    // source discount, so editing a later discount never discounts twice.
    const key = JSON.stringify([name.toLocaleLowerCase('pt-PT'), !!line.isPortes, Number(line.preco).toFixed(6), discountPercent]);
    const previous = grouped.get(key);
    if (previous) {
      previous.unidades = Math.round((previous.unidades + units) * 1e8) / 1e8;
      previous.total = Math.round((previous.total + total) * 100) / 100;
      previous.netTotal = Math.round((previous.netTotal + netTotal) * 100) / 100;
    } else {
      grouped.set(key, { ...line, produto: name, unidades: units, preco: total / units, total, discountPercent, netTotal });
    }
  }
  const items = [...grouped.values()].map(({ netTotal, ...line }) => line);
  return {
    items, discountPercent: 0,
    total: Math.round([...grouped.values()].reduce((sum, line) => sum + line.netTotal, 0) * 100) / 100,
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

export function cartWithCurrentConfiguration(entries, current) {
  const identity = entry => JSON.stringify([entry.simulatorType, entry.configuration, entry.items, entry.discountPercent]);
  if (entries.some(entry => identity(entry) === identity(current))) return {entries, added:false};
  if (entries.length >= CART_LIMIT) throw new Error(`Pode juntar até ${CART_LIMIT} configurações por pedido.`);
  return {entries:[...entries,current],added:true};
}
