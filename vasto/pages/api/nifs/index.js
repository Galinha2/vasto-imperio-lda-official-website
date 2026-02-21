import fetch from "node-fetch";
import * as cheerio from "cheerio";

// Next.js Pages Router API Route
export default async function handler(req, res) {
  const { nif } = req.query;

  if (!nif || !/^\d{9}$/.test(nif)) {
    return res.status(200).json({
      nome: "Cliente",
      nif: nif || "",
      codigoPostal: "V/ Morada",
    });
  }

  try {
    const response = await fetch(`https://www.nif.pt/${nif}/`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const nome = $("span.search-title").text().trim() || "Cliente";
    const nifFormatado = $("h1.big-nif").text().replace(/\s+/g, "").trim() || nif;

    let codigoPostal = "";
    $("div.detail").each((i, el) => {
      const linhas = $(el).text().split("\n");
      for (let linha of linhas) {
        const match = linha.trim().match(/^\d{4}-\d{3}\s+[A-Za-zÀ-ÿ\s]+$/);
        if (match) {
          codigoPostal = match[0].trim();
          break;
        }
      }
    });

    return res.status(200).json({
      nome,
      nif: nifFormatado,
      codigoPostal: codigoPostal || "V/ Morada",
    });
  } catch (err) {
    console.error("Erro ao obter NIF:", err);
    return res.status(200).json({
      nome: "Cliente",
      nif,
      codigoPostal: "V/ Morada",
    });
  }
}