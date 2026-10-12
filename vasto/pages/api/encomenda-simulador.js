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
    const { nome, nif, moradaFiscal, moradaEnvioIgual, moradaEnvio, montagem, telefone, email, observacoes, total, detalhes, artigos } = data;
    if (!nome?.trim() || !/^\d{9}$/.test(String(nif || "")) || !moradaFiscal?.trim() || !telefone?.trim() || !email?.trim() || !Number.isFinite(Number(total))) {
      return res.status(400).json({ error: "Preencha os dados obrigatórios e confirme o NIF." });
    }
    const uploadedImage = Array.isArray(files.imagem) ? files.imagem[0] : files.imagem;
    const uploadedPdf = Array.isArray(files.orcamento) ? files.orcamento[0] : files.orcamento;
    if (!uploadedImage || !uploadedPdf) return res.status(400).json({ error: "O desenho e a folha de orçamento são obrigatórios." });
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
    const row = (label, value) => `<tr><td style="padding:7px 0;width:180px;color:#6e6e73"><strong>${label}</strong></td><td style="padding:7px 0">${escapeHtml(value || "—")}</td></tr>`;
    const shippingAddress = moradaEnvioIgual ? moradaFiscal : moradaEnvio;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#1d1d1f;max-width:760px;margin:auto">
        <h2 style="margin-bottom:6px">Nova encomenda do simulador</h2>
        <p style="margin-top:0;color:#6e6e73">Pedido recebido através do website Vasto Império.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          ${row("Nome", nome)}${row("NIF", nif)}${row("Morada fiscal", moradaFiscal)}${row("Morada de envio", shippingAddress)}${row("Montagem", montagem ? "Sim" : "Não")}${row("Telefone", telefone)}${row("Email", email)}${row("Observações", observacoes)}
        </table>
        <h3 style="margin-bottom:8px">Lista técnica · uso interno Vasto Império</h3>
        <p style="white-space:pre-line;color:#424245">${escapeHtml(detalhes || "")}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:14px">
          <thead><tr style="background:#f5f5f7;text-align:left"><th style="padding:8px">Ref.</th><th style="padding:8px">Artigo</th><th style="padding:8px;text-align:right">Qtd.</th><th style="padding:8px;text-align:right">Total</th></tr></thead>
          <tbody>${listRows}</tbody>
        </table>
        <p style="margin-top:20px;font-size:18px"><strong>Valor final: ${Number(total).toFixed(2).replace(".", ",")} € + IVA à taxa legal em vigor. Transporte não incluído.</strong></p>
      </div>`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: "geral@vastoimperio.pt",
      replyTo: email,
      subject: `Encomenda do simulador | ${nome.trim()}`,
      html,
      attachments: [
        { filename: "desenho-estante.jpg", content: fs.readFileSync(uploadedImage.filepath), contentType: "image/jpeg" },
        { filename: "folha-orcamento.pdf", content: fs.readFileSync(uploadedPdf.filepath), contentType: "application/pdf" },
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
