// Only client-confirmed orders determine whether a month is settled.
export function isMonthComplete(sales, commissionPayment) {
  const confirmed = sales.filter(sale => sale.status === 'confirmada' && !sale.quoteNotSelected);
  return commissionPayment?.paid === true && confirmed.length > 0
    && confirmed.every(sale => sale.paymentStatus === 'pago' && sale.deliveryStatus === 'entregue');
}
