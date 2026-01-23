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
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
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

    const html = `<p>Nova mensagem de ${nameStr}</p><p>${bodyStr}</p>`;
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