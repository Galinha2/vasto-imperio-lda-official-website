import { verifySession, SESSION_COOKIE } from "../../../lib/admin/auth.mjs";
import { listSales } from "../../../lib/admin/store.mjs";
import { customerSuggestions } from "../../../lib/admin/customer-suggestions.mjs";
import { hasCustomerName } from "../../../lib/customer-identity.mjs";
import { addressFromRaciusHtml, postalAddressFromNifHtml, raciusUrlFromNifHtml } from "../../../lib/nif-address.mjs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

// Next.js Pages Router API Route
export default async function handler(req, res) {
  const { nif } = req.query;
  res.setHeader("Cache-Control", "private, no-store");

  if (!nif || !/^\d{9}$/.test(nif)) {
    return res.status(200).json({
      nome: "Cliente",
      nif: nif || "",
      codigoPostal: "",
      morada: "",
    });
  }

  // Names from previous orders are private: only expose them to an authenticated admin.
  if (verifySession(req.cookies?.[SESSION_COOKIE])) {
    try {
      const customer = customerSuggestions(await listSales(), nif, "nif").find((item) => item.nif === nif);
      if (customer) return res.status(200).json({ nome: customer.name, nif: customer.nif, codigoPostal: customer.address || "", source: "historico" });
    } catch { /* A history lookup failure must not prevent manual entry. */ }
  }
  try {
    const response = await fetch(`https://www.nif.pt/${nif}/`, { signal: AbortSignal.timeout(8000) });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Nome da empresa
    const extractedName = $("span.search-title").first().text().trim();
    const nome = hasCustomerName(extractedName) ? extractedName : "Cliente";

    // NIF formatado
    const nifFormatado = $("h1.big-nif").first().text().replace(/\s+/g, "").trim() || nif;

    // nif.pt normally publishes only postcode + locality. If it links to the
    // public company page at Racius, use its structured public head-office address.
    const postalAddress = postalAddressFromNifHtml(html);
    let morada = postalAddress;
    const raciusUrl = raciusUrlFromNifHtml(html);
    if (raciusUrl) {
      try {
        const raciusResponse = await fetch(raciusUrl, { signal: AbortSignal.timeout(6000) });
        if (raciusResponse.ok) morada = addressFromRaciusHtml(await raciusResponse.text()) || postalAddress;
      } catch { /* The postcode/locality remains a useful fallback. */ }
    }
    const codigoPostal = morada || "";

    return res.status(200).json({
      nome,
      nif,
      nomeEncontrado: hasCustomerName(nome),
      codigoPostal,
      morada: morada || "",
    });
  } catch (err) {
    console.error("Erro ao obter NIF:", err);
    return res.status(200).json({
      nome: "Cliente",
      nif,
      codigoPostal: "",
      morada: "",
    });
  }
}
