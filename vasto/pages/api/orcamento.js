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

// Função para determinar ícone baseado no tipo do ficheiro
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext)) {
    return "🖼️";
  } else if (ext === "pdf") {
    return "📄";
  } else {
    return "📎";
  }
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
    let attachmentListHTML = "<p>Sem anexos enviados.</p>";
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

      // Criar lista HTML dos ficheiros com ícones
      if (attachments.length > 0) {
        const fileItems = attachments.map((att) => {
          const icon = getFileIcon(att.filename);
          return `<li style="margin-bottom:8px;">${icon} <strong>${att.filename}</strong></li>`;
        }).join("");
        attachmentListHTML = `
          <ul style="padding-left: 20px; margin: 0;">
            ${fileItems}
          </ul>
        `;
      }
    }

    // HTML do email
    const htmlContent = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        color: #333333;
        line-height: 1.5;
        max-width: 600px;
        margin: auto;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 8px;
      ">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #e1e1e1; padding-bottom: 10px;">Novo Orçamento Recebido de ${name}</h2>
        <p>Recebeu uma nova mensagem de orçamento através do website:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tbody>
            <tr>
              <td style="padding: 8px; font-weight: 600; background-color: #ecf0f1; width: 120px;">Nome</td>
              <td style="padding: 8px; background-color: #ffffff;">${name || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 600; background-color: #ecf0f1;">Email</td>
              <td style="padding: 8px; background-color: #ffffff;">${email || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 600; background-color: #ecf0f1;">Telefone</td>
              <td style="padding: 8px; background-color: #ffffff;">${phone || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 600; background-color: #ecf0f1; vertical-align: top;">Mensagem</td>
              <td style="padding: 8px; background-color: #ffffff; white-space: pre-wrap;">${body || "-"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: 600; background-color: #ecf0f1; vertical-align: top;">Anexos</td>
              <td style="padding: 8px; background-color: #ffffff;">
                ${attachmentListHTML}
              </td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 0.9em; color: #777777; margin-top: 30px;">
          Este e-mail foi enviado automaticamente pelo website.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Orçamento Website" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: email,
      subject: `${name} | Novo orçamento`,
      html: htmlContent,
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