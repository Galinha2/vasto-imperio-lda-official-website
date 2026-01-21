import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

// Função utilitária para parsear formulário multipart
function parseForm(req) {
  const form = formidable({ multiples: false });
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

  try {
    const { fields, files } = await parseForm(req); // agora fields e files existem
    const { name, email, phone, body } = fields;

    // Configura transporte SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Anexos
    let attachments = [];
    if (files.attachment) {
      if (Array.isArray(files.attachment)) {
        attachments = await Promise.all(
          files.attachment
            .filter((file) => file.size > 0)
            .map(async (file) => ({
              filename: file.originalFilename,
              content: await fs.promises.readFile(file.filepath),
            }))
        );
      } else if (files.attachment.filepath && files.attachment.size > 0) {
        attachments = [
          {
            filename: files.attachment.originalFilename,
            content: await fs.promises.readFile(files.attachment.filepath),
          },
        ];
      }
    }

    await transporter.sendMail({
      from: `"Orçamento Website" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `Novo orçamento de ${name}`,
      text: `Nome: ${name}\nEmail: ${email}\nTelefone: ${phone}\nMensagem:\n${body}`,
      attachments,
    });

    res.status(200).json({ message: "Enviado com sucesso" });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Erro interno ao enviar o e-mail",
    });
  }
};