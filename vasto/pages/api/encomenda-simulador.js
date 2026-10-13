import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  let temporaryFiles = [];
  try {
    const form = formidable({ multiples: false, maxFiles: 2, maxFileSize: 15 * 1024 * 1024 });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (error, parsedFields, parsedFiles) => {
        if (error) reject(error);
        else resolve({ fields: parsedFields, files: parsedFiles });
      });
    });
    temporaryFiles = Object.values(files).flat().filter(Boolean).map((file) => file.filepath);
    const rawData = Array.isArray(fields.dados) ? fields.dados[0] : fields.dados;
    const data = JSON.parse(rawData || "{}");
    const { nome, nif, moradaFiscal, moradaEnvioIgual, moradaEnvio, montagem, telefone, email, observacoes, total, detalhes, artigos, idioma, tipoEncomenda } = data;
    const equipmentOrder = tipoEncomenda === "equipamento";
    if (!nome?.trim() || !/^\d{9}$/.test(String(nif || "")) || !moradaFiscal?.trim() || (!moradaEnvioIgual && !moradaEnvio?.trim()) || !telefone?.trim() || !email?.trim() || !Number.isFinite(Number(total))) {
      return res.status(400).json({ error: "Preencha os dados obrigatórios e confirme o NIF." });
    }
    const uploadedImage = Array.isArray(files.imagem) ? files.imagem[0] : files.imagem;
    const uploadedPdf = Array.isArray(files.orcamento) ? files.orcamento[0] : files.orcamento;
    if (!uploadedImage || !uploadedPdf) return res.status(400).json({ error: equipmentOrder ? "A imagem do equipamento e a folha de orçamento são obrigatórios." : "O desenho e a folha de orçamento são obrigatórios." });
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("Faltam variáveis de ambiente do SMTP");
    }

    const items = Array.isArray(artigos) ? artigos : [];
    const listRows = items.map((item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e5e7">${escapeHtml(item.refCompleta || "")}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e7">${escapeHtml(item.produto || "")}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e7;text-align:right">${escapeHtml(item.unidades || 0)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e7;text-align:right">${Number(item.total || 0).toFixed(2).replace(".", ",")} €</td>
      </tr>`).join("");
    const confirmationItemRows = items.map((item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e5e7">${escapeHtml(item.refCompleta || "")}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e7">${escapeHtml(item.produto || "")}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e5e7;text-align:right">${escapeHtml(item.unidades || 0)}</td>
      </tr>`).join("");
    const row = (label, value) => `<tr><td style="padding:7px 0;width:180px;color:#6e6e73"><strong>${label}</strong></td><td style="padding:7px 0">${escapeHtml(value || "—")}</td></tr>`;
    const shippingAddress = moradaEnvioIgual ? moradaFiscal : moradaEnvio;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#1d1d1f;max-width:760px;margin:auto">
        <h2 style="margin-bottom:6px">${equipmentOrder ? "Nova encomenda de equipamento" : "Nova encomenda do simulador"}</h2>
        <p style="margin-top:0;color:#6e6e73">Pedido recebido através do website Vasto Império.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          ${row("Nome", nome)}${row("NIF", nif)}${row("Morada fiscal", moradaFiscal)}${row("Morada de envio", shippingAddress)}${equipmentOrder ? "" : row("Montagem", montagem ? "Sim" : "Não")}${row("Telefone", telefone)}${row("Email", email)}${row("Observações", observacoes)}
        </table>
        <h3 style="margin-bottom:8px">Lista técnica · uso interno Vasto Império</h3>
        <p style="white-space:pre-line;color:#424245">${escapeHtml(detalhes || "")}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:14px">
          <thead><tr style="background:#f5f5f7;text-align:left"><th style="padding:8px">Ref.</th><th style="padding:8px">Artigo</th><th style="padding:8px;text-align:right">Qtd.</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
          <tbody>${listRows}</tbody>
        </table>
        <p style="margin-top:20px;font-size:18px"><strong>Valor final: ${Number(total).toFixed(2).replace(".", ",")} € + IVA à taxa legal em vigor. Transporte não incluído.</strong></p>
      </div>`;

    const english = idioma === "en";
    const confirmationRow = (label, value) => `<tr><td style="padding:8px 0;width:190px;color:#6e6e73;vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td style="padding:8px 0">${escapeHtml(value || "—")}</td></tr>`;
    const confirmationHtml = `
      <div style="font-family:Arial,sans-serif;color:#1d1d1f;max-width:760px;margin:auto">
        <h2 style="margin-bottom:6px">${english ? "Order confirmation" : "Confirmação da encomenda"}</h2>
        <p style="margin-top:0;color:#6e6e73">${english ? `Hello ${escapeHtml(nome)}, we received your order request. Here is a copy of the information you submitted.` : `Olá ${escapeHtml(nome)}, recebemos o seu pedido de encomenda. Segue uma cópia dos dados que submeteu.`}</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          ${confirmationRow(english ? "Name" : "Nome", nome)}
          ${confirmationRow(english ? "Tax number" : "NIF", nif)}
          ${confirmationRow(english ? "Billing address" : "Morada fiscal", moradaFiscal)}
          ${confirmationRow(english ? "Shipping address" : "Morada de envio", shippingAddress)}
          ${equipmentOrder ? "" : confirmationRow(english ? "Assembly" : "Montagem", montagem ? (english ? "Yes" : "Sim") : (english ? "No" : "Não"))}
          ${confirmationRow(english ? "Phone" : "Contacto telefónico", telefone)}
          ${confirmationRow(english ? "Email" : "Email", email)}
          ${confirmationRow(english ? "Notes" : "Observações", observacoes)}
          ${confirmationRow(english ? "Configuration" : "Configuração", detalhes)}
        </table>
        <h3 style="margin:24px 0 8px">${english ? "Items" : "Artigos"}</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f5f5f7;text-align:left"><th style="padding:8px">Ref.</th><th style="padding:8px">${english ? "Item" : "Artigo"}</th><th style="padding:8px;text-align:right">${english ? "Qty." : "Qtd."}</th></tr></thead>
          <tbody>${confirmationItemRows}</tbody>
        </table>
        <p style="margin-top:20px;font-size:18px"><strong>${english ? "Final value" : "Valor final"}: ${Number(total).toFixed(2).replace(".", ",")} € ${english ? "+ VAT at the applicable rate. Delivery is not included." : "+ IVA à taxa legal em vigor. Transporte não incluído."}</strong></p>
        <p style="color:#6e6e73">${english ? "Our team will contact you to follow up on your request." : "A equipa da Vasto Império entrará em contacto para dar seguimento ao pedido."}</p>
      </div>`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
    const imageAttachment = fs.readFileSync(uploadedImage.filepath);
    const imageFilename = equipmentOrder ? "imagem-equipamento.jpg" : "desenho-estante.jpg";
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: "geral@vastoimperio.pt",
      replyTo: email,
      subject: `${equipmentOrder ? "Encomenda de equipamento" : "Encomenda do simulador"} | ${nome.trim()}`,
      html,
      attachments: [
        { filename: imageFilename, content: imageAttachment, contentType: "image/jpeg" },
        { filename: "folha-orcamento.pdf", content: fs.readFileSync(uploadedPdf.filepath), contentType: "application/pdf" },
      ],
    });
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      replyTo: "geral@vastoimperio.pt",
      subject: `${english ? "Order confirmation" : "Confirmação da encomenda"} | ${nome.trim()}`,
      html: confirmationHtml,
      attachments: [
        { filename: imageFilename, content: imageAttachment, contentType: "image/jpeg" },
      ],
    });
    return res.status(200).json({ message: "Encomenda enviada com sucesso." });
  } catch (error) {
    console.error("Erro ao enviar encomenda do simulador:", error);
    return res.status(500).json({ error: "Não foi possível enviar a encomenda neste momento." });
  } finally {
    temporaryFiles.forEach((filepath) => {
      try { fs.unlinkSync(filepath); } catch { /* temporary upload may already be removed */ }
    });
  }
}
