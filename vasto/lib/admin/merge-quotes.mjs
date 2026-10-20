import { sameQuoteCustomer } from "./quote-groups.mjs";
export function assertMergeable(source, target) {
  if (!source || !target || source.id === target.id || source.mergedInto || target.mergedInto || source.mergeArchived || target.mergeArchived) throw Object.assign(new Error("Escolha dois orçamentos disponíveis diferentes."), { status:400 });
  if (!sameQuoteCustomer(source,target)) throw Object.assign(new Error("Só pode juntar orçamentos com o mesmo nome de cliente ou NIF."),{status:400});
  if ([source,target].some((sale)=>sale.paymentStatus !== "por_pagar" || sale.deliveryStatus === "entregue")) throw Object.assign(new Error("Não é possível juntar documentos já pagos, com entrada ou entregues. A junção destina-se a orçamentos."),{status:400});
}
export function combinedQuoteLines(quotes) {
  // Convert each source's discount into its own net unit prices, preserving both offers.
  return quotes.flatMap(({lines,discount})=>lines.map((line)=>({ ...line, preco:line.preco*(line.isPortes?1:1-discount/100), total:line.total*(line.isPortes?1:1-discount/100) })));
}
