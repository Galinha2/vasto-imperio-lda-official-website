import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

// Função utilitária para parsear formulário multipart
function parseForm(req) {
  const form = formidable({ multiples: true, maxFiles: 3 });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_USER:", process.env.SMTP_USER ? "****" : "Not Set");
  console.log("RECEIVER_EMAIL:", process.env.RECEIVER_EMAIL);

  try {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      !process.env.RECEIVER_EMAIL
    ) {
      throw new Error("Missing required SMTP environment variables");
    }

    const { fields, files } = await parseForm(req);
    const { name, email, phone, body } = fields;

    const port = parseInt(process.env.SMTP_PORT, 10);
    if (port !== 465) {
      throw new Error("SMTP_PORT must be 465 for SSL connection");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      family: 4, // força IPv4
    });

    // Anexos: suporta até 3 ficheiros
    let attachments = [];
    if (files.attachment) {
      let fileArray = [];
      if (Array.isArray(files.attachment)) {
        fileArray = files.attachment.slice(0, 3);
      } else {
        fileArray = [files.attachment];
      }
      attachments = await Promise.all(
        fileArray
          .filter((file) => file && file.size > 0)
          .map(async (file) => ({
            filename: file.originalFilename || "attachment",
            content: await fs.promises.readFile(file.filepath),
          }))
      );
    }

    await transporter.sendMail({
      from: `"Orçamento Website" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: email,
      subject: `Novo orçamento de ${name}`,
      text: `Nome: ${name}\nEmail: ${email}\nTelefone: ${phone}\nMensagem:\n${body}`,
      attachments,
    });

    // Redirecionamento seguro para página de sucesso
    res.status(200).json({ message: "Enviado com sucesso", redirect: "/orcamento/sucesso" });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Erro interno ao enviar o e-mail",
      stack: error.stack || null,
      smtpHost: process.env.SMTP_HOST || null,
      smtpPort: process.env.SMTP_PORT || null,
      smtpUser: process.env.SMTP_USER ? "****" : null,
      receiverEmail: process.env.RECEIVER_EMAIL || null,
    });
  }
}