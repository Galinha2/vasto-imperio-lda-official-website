import { sameQuoteCustomer } from "./quote-groups.mjs";
export function assertMergeable(source, target) {
  if (!source || !target || source.id === target.id || source.mergedInto || target.mergedInto || source.mergeArchived || target.mergeArchived) throw Object.assign(new Error("Escolha dois orçamentos disponíveis diferentes."), { status:400 });
  if (!sameQuoteCustomer(source,target)) throw Object.assign(new Error("Só pode juntar orçamentos com o mesmo nome de cliente ou NIF."),{status:400});
  if ([source,target].some((sale)=>sale.paymentStatus !== "por_pagar" || sale.deliveryStatus === "entregue")) throw Object.assign(new Error("Não é possível juntar documentos já pagos, com entrada ou entregues. A junção destina-se a orçamentos."),{status:400});
}
export function combinedQuoteLines(quotes) {
  // Consolidate matching articles at the same net price, without losing source discounts.
  const grouped = new Map();
  const normalize = (value) => String(value || "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-PT");
  for (const { lines, discount } of quotes) {
    for (const line of lines) {
      const factor = line.isPortes ? 1 : 1 - Number(discount || 0) / 100;
      const price = Number(line.preco) * factor;
      const reference = normalize(line.refCompleta);
      const identity = reference ? `ref:${reference}` : `name:${normalize(line.produto)}`;
      const key = JSON.stringify([identity, price.toFixed(2), Boolean(line.isPortes)]);
      const quantity = Number(line.unidades);
      const total = Number(line.total) * factor;
      const existing = grouped.get(key);
      if (existing) {
        existing.unidades += quantity;
        existing.total += total;
        existing.preco = existing.total / existing.unidades;
      } else {
        grouped.set(key, { ...line, unidades: quantity, preco: price, total });
      }
    }
  }
  return [...grouped.values()];
}
