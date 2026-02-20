import puppeteer from "puppeteer";

export default async function handler(req, res) {
  const { nif } = req.query;

  if (!nif || !/^\d{9}$/.test(nif)) {
    return res.status(400).json({ error: "NIF inválido" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(`https://www.nif.pt/${nif}/`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Espera até o JS carregar o nome
    await page.waitForSelector(".search-title", { timeout: 10000 });

    const dados = await page.evaluate(() => {
      const nomeEl = document.querySelector(".search-title");
      const nome = nomeEl ? nomeEl.innerText.trim() : "";

      const textoPagina = document.body.innerText;
      const cpMatch = textoPagina.match(/\d{4}-\d{3}[^\n]*/);
      const codigoPostal = cpMatch ? cpMatch[0].trim() : "";

      return { nome, codigoPostal };
    });

    await browser.close();

    return res.status(200).json({
      nome: dados.nome,
      nif,
      codigoPostal: dados.codigoPostal,
    });
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ error: "Erro ao obter dados do NIF" });
  }
}