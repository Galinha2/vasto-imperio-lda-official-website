import * as cheerio from "cheerio";

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

function addressFromStructuredData($) {
  for (const script of $("script[type='application/ld+json']").toArray()) {
    try {
      const data = JSON.parse($(script).text());
      const entries = Array.isArray(data) ? data : [data, ...(data?.['@graph'] || [])];
      for (const entry of entries) {
        const address = entry?.address;
        if (!address || typeof address !== "object") continue;
        const line = clean([address.streetAddress, address.postalCode, address.addressLocality].filter(Boolean).join(" "));
        if (line) return line;
      }
    } catch { /* A malformed unrelated JSON-LD block must not stop the lookup. */ }
  }
  return "";
}

export function addressFromRaciusHtml(html) {
  const $ = cheerio.load(html || "");
  const structured = addressFromStructuredData($);
  if (structured) return structured;

  const label = $(".detail__key-info").filter((_, element) => clean($(element).text()).toLocaleLowerCase("pt-PT") === "morada").first();
  return clean(label.next("p").text());
}

export function postalAddressFromNifHtml(html) {
  const $ = cheerio.load(html || "");
  // Cheerio's .text() joins nodes separated by <br> without a space. Preserve
  // those separators so the postcode is not glued to the preceding NIF.
  const detailHtml = $("div.detail").first().html() || "";
  const detail = clean(cheerio.load(detailHtml.replace(/<br\s*\/?>/gi, " ")).text());
  const match = detail.match(/\b\d{4}-\d{3}\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]*/);
  return clean(match?.[0]);
}

export function raciusUrlFromNifHtml(html) {
  const $ = cheerio.load(html || "");
  const raw = $("a.link-racius").first().attr("href") || "";
  try {
    const url = new URL(raw, "https://www.nif.pt");
    return /(^|\.)racius\.com$/i.test(url.hostname) ? url.toString() : "";
  } catch {
    return "";
  }
}
