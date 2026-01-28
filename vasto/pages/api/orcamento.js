// pages/api/orcamento.js
import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // necessário para multipart/form-data
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // validar variáveis de ambiente
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.RECEIVER_EMAIL) {
      throw new Error("Faltam variáveis de ambiente do SMTP");
    }

    // parse do formulário multipart
    const form = formidable({ multiples: true, maxFiles: 3 });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const nameStr = Array.isArray(fields.name) ? fields.name[0] : fields.name || "";
    const emailStr = Array.isArray(fields.email) ? fields.email[0] : fields.email || "";
    const phoneStr = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone || "";
    const bodyStr = Array.isArray(fields.body) ? fields.body[0] : fields.body || "";

    if (!nameStr.trim() || !emailStr.trim() || !bodyStr.trim()) {
      return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,       // mail.vastoimperio.pt
      port: 587,                          // STARTTLS
      secure: false,                      // false = STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,        // ignora mismatch de certificado
      },
    });

    const attachments = [];
    if (files.attachment) {
      const fileArray = Array.isArray(files.attachment) ? files.attachment.slice(0, 3) : [files.attachment];
      for (const file of fileArray) {
        attachments.push({
          filename: file.originalFilename,
          content: fs.readFileSync(file.filepath),
        });
      }
    }

    const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2;padding:20px;font-family:Arial,sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:20px;">
        <tr>
          <td style="text-align:center;padding-bottom:20px;">
            <h2 style="margin:0;color:#333;">Novo Pedido de Orçamento</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <strong>Nome:</strong><br/>
            <span>${nameStr}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <strong>Email:</strong><br/>
            <span>${emailStr}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <strong>Telemóvel:</strong><br/>
            <span>${phoneStr || "Não indicado"}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <strong>Mensagem:</strong><br/>
            <div style="margin-top:5px;white-space:pre-line;">
              ${bodyStr}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding-top:30px;text-align:center;font-size:12px;color:#777;">
            Pedido enviado através do formulário do website
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.RECEIVER_EMAIL,
      replyTo: emailStr,
      subject: `${nameStr} | Novo orçamento`,
      html,
      attachments,
    });

    return res.status(200).json({ message: "Enviado com sucesso" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}