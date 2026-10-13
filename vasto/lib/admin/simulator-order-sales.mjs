import { addSaleImage, createSale, deleteSale, getSale } from "./store.mjs";
import { parseSalePdf } from "./pdf.mjs";

export async function saveSimulatorOrderToSales({ pdfBuffer, imageBuffer, imageName, imageContentType, orderDetails }) {
  let saleId;
  let created = false;

  try {
    const record = await parseSalePdf(pdfBuffer, "encomenda-simulador.pdf");
    record.status = "confirmada";
    record.saleDate = record.issuedAt;
    record.orderDetails = orderDetails;

    try {
      await createSale(record, pdfBuffer);
      saleId = record.id;
      created = true;
    } catch (error) {
      if (error.status !== 409) throw error;
      const existing = await getSale(record.id);
      if (!existing) throw error;
      saleId = existing.id;
      if (existing.images?.length) return true;
    }

    await addSaleImage(saleId, imageName, imageContentType, imageBuffer);
    return true;
  } catch (error) {
    if (created && saleId) {
      try {
        await deleteSale(saleId);
      } catch (cleanupError) {
        console.error("[simulator-sales-dashboard] Failed to clean up an incomplete order record.", cleanupError.message);
      }
    }
    console.error("[simulator-sales-dashboard] Could not save public simulator order; email delivery is unaffected.", error.message);
    return false;
  }
}
