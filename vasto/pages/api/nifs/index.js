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

    // Nome da empresa
    const nome = $("span.search-title").first().text().trim() || "Cliente";

    // NIF formatado
    const nifFormatado = $("h1.big-nif").first().text().replace(/\s+/g, "").trim() || nif;

    // Morada (código postal + local) - Extração correta da morada e códigoPostal
    let codigoPostal = "V/ Morada";
    let morada = "";
    // A morada e código postal normalmente aparecem em <div class="detail"><br>Morada<br>...</div>
    // Vamos buscar o HTML, não só o texto, para analisar as quebras de linha (<br>)
    const detailHtml = $("div.detail").first().html() || "";
    // Separar por <br>
    const moradaLines = detailHtml.split(/<br\s*\/?>/i).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    // Procurar a linha com código postal (formato xxxx-xxx)
    let foundCP = "";
    for (const line of moradaLines) {
      const cpMatch = line.match(/\d{4}-\d{3}\s+[A-Za-zÀ-ÿ\s]+/);
      if (cpMatch) {
        foundCP = cpMatch[0].trim();
        break;
      }
    }
    if (foundCP) {
      codigoPostal = foundCP;
    }

    return res.status(200).json({
      nome,
      nif: nifFormatado,
      codigoPostal,
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