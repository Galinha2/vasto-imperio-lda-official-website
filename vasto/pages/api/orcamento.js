import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Pasta temporária para ficheiros
  const uploadDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const form = formidable({
    multiples: true,
    keepExtensions: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    uploadDir,
    maxFiles: 3,
  });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const name = fields.name || "Sem Nome";
    const email = fields.email || "Sem Email";
    const phone = fields.phone || "Sem Telefone";
    const body = fields.body || "";

    let attachments = [];

    // Processar todos os ficheiros enviados
    const uploadedFiles = [];
    Object.keys(files).forEach(key => {
      const fileEntry = files[key];
      if (Array.isArray(fileEntry)) uploadedFiles.push(...fileEntry);
      else if (fileEntry?.filepath) uploadedFiles.push(fileEntry);
    });

    for (const file of uploadedFiles) {
      if (file.filepath && fs.existsSync(file.filepath)) {
        attachments.push({
          filename: file.originalFilename || `file-${attachments.length + 1}`,
          path: file.filepath,
        });
      }
    }

    // No fallback attachment added if no files uploaded

    // Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Website" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      subject: `${name} | Novo pedido de orçamento`,
      text: `
Nome: ${name}
Email: ${email}
Telefone: ${phone}

Mensagem:
${body}
      `,
      attachments,
    });

    // Redirecionar para página de sucesso
    res.writeHead(302, { Location: "/sucesso" });
    res.end();
  } catch (err) {
    console.error("Erro ao enviar email:", err);
    res.status(500).json({ error: err.message });
  }
}