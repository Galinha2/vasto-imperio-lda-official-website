import { quoteFilename } from '../quote-filenames.mjs';
import { getPdf, getSaleImage, listSales } from './store.mjs';

export async function quoteEmailAttachments(id, includeGroup, storage = { getPdf, getSaleImage, listSales }) {
  const { record, buffer } = await storage.getPdf(id);
  const records = includeGroup && record.quoteGroupId
    ? (await storage.listSales()).filter((sale) => sale.quoteGroupId === record.quoteGroupId).sort((a, b) => Number(b.status === "confirmada") - Number(a.status === "confirmada"))
    : [record];
  if (!records.some((sale) => sale.id === id)) throw Object.assign(new Error('O grupo foi alterado. Abra novamente o email.'), { status: 409 });
  const attachments = [];
  for (const [index, sale] of records.entries()) {
    const prefix = records.length > 1 ? `${index + 1} - ` : '';
    const pdf = sale.id === id ? buffer : (await storage.getPdf(sale.id)).buffer;
    attachments.push({ filename: prefix + quoteFilename(sale), content: pdf, contentType: 'application/pdf' });
    for (const [imageIndex, image] of (sale.images || []).entries()) {
      const saved = await storage.getSaleImage(sale.id, image.id);
      const extension = image.contentType === 'image/png' ? 'png' : image.contentType === 'image/webp' ? 'webp' : 'jpg';
      attachments.push({ filename: prefix + quoteFilename(sale, 'Desenho', extension, imageIndex + 1), content: saved.buffer, contentType: image.contentType });
    }
  }
  return { attachments, saleIds: records.map((sale) => sale.id) };
}
