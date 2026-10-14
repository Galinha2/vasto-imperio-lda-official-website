import test from "node:test";
import assert from "node:assert/strict";
import { groupQuotes } from "../lib/admin/quote-groups.mjs";
const quote = (id, updates = {}) => ({ id, customerName: "Empresa Exemplo", nif: "123456789", issuedAt: "2026-10-14", uploadedAt: "2026-10-14T10:00:00Z", status: "em_preparacao", fileName: `bancadas-${id}.pdf`, subtotal: 100, ...updates });

test("four bench specifications collapse into one group without changing records or totals", () => {
  const sales = [1, 2, 3, 4].map((id) => quote(String(id), { subtotal: id * 100 }));
  const original = JSON.stringify(sales);
  const groups = groupQuotes(sales);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "Bancadas");
  assert.equal(groups[0].sales.length, 4);
  assert.equal(JSON.stringify(sales), original);
});

test("different customers, days, equipment, confirmed sales and detached quotes stay separate", () => {
  const sales = [quote("1"), quote("2", { nif: "987654321" }), quote("3", { issuedAt: "2026-10-15" }), quote("4", { fileName: "racks.pdf" }), quote("5", { status: "confirmada" }), quote("6", { quoteSeparate: true })];
  assert.equal(groupQuotes(sales).length, sales.length);
});

test("named projects span dates but never customers; anonymous clients are not inferred", () => {
  assert.equal(groupQuotes([quote("1", { quoteProject: "Oficina" }), quote("2", { quoteProject: "oficina", issuedAt: "2026-10-20" })]).length, 1);
  assert.equal(groupQuotes([quote("1", { quoteProject: "Oficina" }), quote("2", { quoteProject: "Loja" })]).length, 2);
  assert.equal(groupQuotes([quote("1", { nif: "", customerName: "Cliente" }), quote("2", { nif: "", customerName: "Cliente" })]).length, 2);
  assert.equal(groupQuotes([quote("1", { quoteProject: "Oficina" }), quote("2", { quoteProject: "Oficina", nif: "987654321" })]).length, 2);
});

test("filtering can reveal a matching version without dropping it", () => {
  const sales = [quote("1"), quote("2")].filter((sale) => sale.id === "2");
  assert.equal(groupQuotes(sales)[0].sales[0].id, "2");
});


test("specification changes at the same price are variants; identical configurations are not", () => {
  const a = quote("1", { quoteDetails: "Bancada · Altura 950 mm · 1 nível" });
  const b = quote("2", { quoteDetails: "Bancada · Altura 1000 mm · 2 níveis" });
  assert.equal(groupQuotes([a, b]).length, 1);
  assert.equal(groupQuotes([a, { ...a, id: "3", subtotal: 900 }]).length, 2);
});

test("one-hour window spans clock boundaries but never chains into later requests", () => {
  const a = quote("1", { subtotal: 100, uploadedAt: "2026-10-14T10:50:00Z" });
  const b = quote("2", { subtotal: 200, uploadedAt: "2026-10-14T11:20:00Z" });
  const c = quote("3", { subtotal: 300, uploadedAt: "2026-10-14T11:55:00Z" });
  assert.deepEqual(groupQuotes([c, b, a]).map((g) => g.sales.length).sort(), [1, 2]);
  assert.equal(groupQuotes([a, { ...b, uploadedAt: "2026-10-14T11:50:00Z" }]).length, 1);
  assert.equal(groupQuotes([a, { ...b, uploadedAt: "2026-10-14T11:50:01Z" }]).length, 2);
});

test("PDF creation time prevents unrelated old documents uploaded together from grouping", () => {
  const a = quote("1", { quoteCreatedAt: "2026-10-14T08:00:00Z", subtotal: 100 });
  const b = quote("2", { quoteCreatedAt: "2026-10-14T12:00:00Z", subtotal: 200 });
  assert.equal(groupQuotes([a, b]).length, 2);
  assert.equal(groupQuotes([quote("3", { uploadedAt: undefined }), quote("4", { uploadedAt: undefined, subtotal: 200 })]).length, 2);
});

test("name fallback works when one NIF is missing, but conflicting NIFs block matching", () => {
  assert.equal(groupQuotes([quote("1"), quote("2", { nif: "", subtotal: 200 })]).length, 1);
  assert.equal(groupQuotes([quote("1"), quote("2", { nif: "987654321", subtotal: 200 })]).length, 2);
});
