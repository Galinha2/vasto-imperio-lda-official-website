const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

function validTime(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : null;
}

export function quoteFollowUpDue(sale, now = Date.now()) {
  if (!sale || sale.status !== "em_preparacao" || sale.quoteNotSelected || sale.mergedInto || sale.mergeArchived) return false;
  if (!String(sale.orderDetails?.email || "").trim()) return false;
  const lastContact = validTime(sale.quoteFollowUpSentAt) ?? validTime(sale.emailSentAt);
  return lastContact !== null && now - lastContact >= TEN_DAYS;
}

export function quoteFollowUpDraft(sale) {
  const quote = sale?.quoteNumber ? ` #${sale.quoteNumber}` : "";
  return {
    subject: `Acompanhamento do orçamento${quote} · Vasto Império`,
    message: `Bom dia,\n\nEsperamos que se encontre bem.\n\nHá alguns dias enviámos o nosso orçamento${quote} para a sua apreciação. Gostaríamos de saber se conseguiu analisar a proposta e se existe algum detalhe que possamos ajustar para a solução ficar mais adequada ao seu espaço e às suas necessidades.\n\nSe pretender avançar, basta responder a este email e tratamos consigo dos próximos passos. Se o projeto estiver em pausa ou já não for necessário, agradecemos uma breve indicação.\n\nEstamos disponíveis para esclarecer qualquer questão.`,
  };
}
