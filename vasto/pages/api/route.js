import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const nif = searchParams.get("nif");

  if (!nif) {
    return Response.json({ error: "NIF obrigatório" }, { status: 400 });
  }

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.goto(`https://www.nif.pt/?q=${nif}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const nome = await page.evaluate(() => {
      return document.querySelector("h1")?.innerText || null;
    });

    await browser.close();

    return Response.json({ nome });

  } catch (error) {
    return Response.json({ error: "Erro ao consultar NIF" }, { status: 500 });
  }
}