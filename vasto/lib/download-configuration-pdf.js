import { configurationReference, estimatedTax, capacityConditions } from './configuration-summary.mjs';

// Local informational export: does not reserve quote numbers, send email or create a sale.
export async function configurationPdf({ quote, image, english = false }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ compress: true });
  const reference = configurationReference(quote);
  const money = value => new Intl.NumberFormat(english ? 'en-IE' : 'pt-PT', { style: 'currency', currency: 'EUR' }).format(value).replace(/\u00a0/g, ' ');
  const tax = estimatedTax(quote.total);
  doc.setFontSize(20); doc.setTextColor(255, 85, 0); doc.text('Vasto Império', 14, 20);
  doc.setTextColor(30); doc.setFontSize(14); doc.text(english ? 'Configuration summary' : 'Resumo da configuração', 14, 30);
  doc.setFontSize(9); doc.text(`${reference} · ${new Date().toLocaleDateString(english ? 'en-GB' : 'pt-PT')}`, 14, 38);
  doc.setFontSize(10);
  const totals = [
    `${english ? 'Estimated net total' : 'Total estimado sem IVA'}: ${money(tax.net)}`,
    `${english ? 'Estimated total with VAT (23%, mainland Portugal)' : 'Total estimado com IVA (23%, Portugal continental)'}: ${money(tax.gross)}`,
    english ? 'VAT subject to confirmation. Delivery and assembly are not included.' : 'IVA sujeito a confirmação. Transporte e montagem não incluídos.',
  ];
  doc.text(totals, 14, 47);
  if (image) {
    const props = doc.getImageProperties(image);
    const height = Math.min(90, 182 * props.height / props.width);
    const width = Math.min(182, height * props.width / props.height);
    doc.addImage(image, 'JPEG', (210 - width) / 2, 65, width, height);
  }
  autoTable(doc, { startY: image ? 163 : 68, theme: 'plain', margin: { left: 14, right: 14 }, styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' }, body: [[quote.details || '']], columnStyles: { 0: { cellWidth: 182 } } });
  doc.addPage(); doc.setFontSize(15); doc.text(english ? 'Components' : 'Componentes', 14, 20);
  autoTable(doc, { startY: 27, head: [[english ? 'Reference' : 'Referência', english ? 'Component' : 'Componente', english ? 'Quantity' : 'Quantidade']], body: quote.items.map(line => [line.refCompleta || '', line.produto, line.unidades]), styles: { fontSize: 9, overflow: 'linebreak' }, headStyles: { fillColor: [8, 121, 192] }, margin: { bottom: 18 } });
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, theme: 'plain', styles: { fontSize: 9, cellPadding: 3 }, body: [
    [capacityConditions[english ? 'en' : 'pt']],
    [english ? 'Informational estimate, free of charge and without obligation. This is not an accepted order or an approved technical design. Availability, delivery, assembly and final commercial terms will be confirmed by Vasto Império.' : 'Estimativa informativa, gratuita e sem compromisso. Não constitui uma encomenda aceite nem um projeto técnico aprovado. Disponibilidade, transporte, montagem e condições comerciais finais serão confirmados pela Vasto Império.'],
    ['geral@vastoimperio.pt · +351 928 348 117 · vastoimperio.pt'],
  ] });
  for (let i = 1; i <= doc.getNumberOfPages(); i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(100); doc.text(`${reference} · ${i}/${doc.getNumberOfPages()}`, 14, 289); }
  return { blob: doc.output('blob'), reference };
}
export default async function downloadConfigurationPdf(options) {
  const { blob, reference } = await configurationPdf(options);
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${reference}.pdf`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
