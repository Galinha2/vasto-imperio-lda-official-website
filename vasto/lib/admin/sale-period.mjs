// A entrega não altera o mês em que a venda foi confirmada pelo cliente.
export const salePeriodDate = (sale) => sale.status === 'em_preparacao' ? sale.issuedAt : sale.saleDate || sale.issuedAt;
