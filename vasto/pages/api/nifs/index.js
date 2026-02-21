import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";

// Next.js Pages Router API Route
export default async function handler(req, res) {
  try {
    const { nif } = req.query;

    if (!nif || !/^\d{9}$/.test(nif)) {
      return res.status(200).json({
        nome: "Cliente",
        nif: nif || "",
        codigoPostal: "V/ Morada",
      });
    }

    const isProduction = process.env.VERCEL === "1";
    let browser;
    try {
      if (isProduction) {
        browser = await puppeteerCore.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      } else {
        browser = await puppeteer.launch({ headless: true });
      }

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await page.goto(`https://www.nif.pt/${nif}/`, {
        waitUntil: "networkidle2",
        timeout: 60000, // aumentar timeout para 60s
      });



      const dados = await page.evaluate(() => {
        const nomeEl = document.querySelector("span.search-title");
        const nifEl = document.querySelector("h1.big-nif");

        let nome = nomeEl ? nomeEl.innerText.trim() : "";
        let nifFormatado = nifEl ? nifEl.innerText.replace(/\s+/g, "").trim() : "";

        // Extrair apenas a linha exata do código postal + local
        const detailDiv = document.querySelector("div.detail");
        let codigoPostal = "";

        if (detailDiv) {
          const linhas = detailDiv.innerText.split("\n");
          for (let linha of linhas) {
            const limpa = linha.trim();
            const match = limpa.match(/^\d{4}-\d{3}\s+[A-Za-zÀ-ÿ\s]+$/);
            if (match) {
              codigoPostal = match[0].trim();
              break; // apenas a primeira ocorrência válida
            }
          }
        }

        return {
          nome,
          nif: nifFormatado,
          codigoPostal,
        };
      });

      await browser.close();

      return res.status(200).json({
        nome: dados.nome || "Cliente",
        nif: dados.nif || nif,
        codigoPostal: dados.codigoPostal || "V/ Morada",
      });
    } catch (err) {
      console.error("Erro Puppeteer:", err);
      if (browser) await browser.close();
      return res.status(200).json({
        nome: "Cliente",
        nif,
        codigoPostal: "V/ Morada",
      });
    }
  } catch (err) {
    console.error("Erro Puppeteer:", err);
    return res.status(200).json({
      nome: "Cliente",
      nif: "",
      codigoPostal: "V/ Morada",
    });
  }
}