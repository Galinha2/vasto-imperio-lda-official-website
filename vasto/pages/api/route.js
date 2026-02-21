// vasto/app/api/nifs/route.js
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const nif = searchParams.get("nif");

    if (!nif || !/^\d{9}$/.test(nif)) {
      return new Response(
        JSON.stringify({ error: "NIF inválido" }),
        { status: 400 }
      );
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
        waitUntil: "networkidle0", // esperar até não haver requests pendentes
        timeout: 30000,
      });

      // Pequeno retry loop para tentar capturar .search-title
      let nomeEncontrado = false;
      for (let i = 0; i < 3; i++) {
        try {
          await page.waitForSelector(".search-title", { timeout: 7000 });
          nomeEncontrado = true;
          break;
        } catch {
          // Esperar 1s antes de tentar novamente
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!nomeEncontrado) {
        await browser.close();
        return new Response(
          JSON.stringify({ error: "NIF não encontrado" }),
          { status: 404 }
        );
      }

      const dados = await page.evaluate(() => {
        const nomeEl = document.querySelector(".search-title");
        const nome = nomeEl ? nomeEl.innerText.trim() : "";

        const textoPagina = document.body.innerText;
        const cpMatch = textoPagina.match(/\d{4}-\d{3}[^\n]*/);
        const codigoPostal = cpMatch ? cpMatch[0].trim() : "";

        return { nome, codigoPostal };
      });

      await browser.close();

      return new Response(
        JSON.stringify({
          nome: dados.nome,
          nif,
          codigoPostal: dados.codigoPostal,
        }),
        { status: 200 }
      );
    } catch (err) {
      if (browser) await browser.close();
      console.error("Erro no Puppeteer:", err);
      return new Response(
        JSON.stringify({ error: "Erro ao obter dados do NIF" }),
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Erro geral API NIF:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar requisição" }),
      { status: 500 }
    );
  }
}