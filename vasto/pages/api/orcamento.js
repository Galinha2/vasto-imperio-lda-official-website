import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao processar o formulário" });
    }

    const { name, email, phone, body } = fields;

    if (!name || !email || !phone || !body)
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });

    try {
      // Configuração SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465, // true para 465, false para outros
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      let attachments = [];

      if (files) {
        let fileArray = [];

        if (Array.isArray(files.files)) {
          fileArray = files.files.slice(0, 3);
        } else if (files.files) {
          fileArray = [files.files];
        }

        for (const file of fileArray) {
          attachments.push({
            filename: file.originalFilename || file.newFilename || "attachment",
            path: file.filepath,
          });
        }
      }

      const mailOptions = {
        from: `"Orçamento Website" <${email}>`,
        to: process.env.RECEIVER_EMAIL, // teu email
        subject: `Novo orçamento de ${name}`,
        text: `Nome: ${name}\nEmail: ${email}\nTelefone: ${phone}\nMensagem:\n${body}`,
        attachments,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao enviar email" });
    }
  });
}