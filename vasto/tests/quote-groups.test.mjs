import test from "node:test";
import assert from "node:assert/strict";
import { groupQuotes, sameQuoteCustomer } from "../lib/admin/quote-groups.mjs";
const quote = (id, updates = {}) => ({ id, customerName: "Empresa Exemplo", nif: "123456789", status: "em_preparacao", ...updates });

test("identical client, time and specifications never group automatically", () => {
  assert.equal(groupQuotes([quote("1"), quote("2"), quote("3")]).length, 3);
});
test("manual membership collapses versions regardless of time, equipment or workflow", () => {
  const sales = [quote("1", { quoteGroupId: "group" }), quote("2", { quoteGroupId: "group", status: "confirmada" }), quote("3")];
  const original = JSON.stringify(sales);
  assert.deepEqual(groupQuotes(sales).map((g) => g.sales.length), [2, 1]);
  assert.equal(JSON.stringify(sales), original);
  assert.equal(groupQuotes(sales)[0].sales[0].id, "2");
});
test("matching name OR NIF permits grouping, empty identities never match", () => {
  assert.equal(sameQuoteCustomer(quote("1"), quote("2", { nif: "987654321" })), true);
  assert.equal(sameQuoteCustomer(quote("1"), quote("2", { customerName: "Outro nome" })), true);
  assert.equal(sameQuoteCustomer(quote("1"), quote("2", { customerName: "Outro", nif: "987654321" })), false);
  assert.equal(sameQuoteCustomer(quote("1", { nif: "", customerName: "" }), quote("2", { nif: "", customerName: "" })), false);
});
test("old inferred grouping fields are ignored", () => {
  assert.equal(groupQuotes([quote("1", { quoteProject: "Oficina" }), quote("2", { quoteProject: "Oficina" })]).length, 2);
});
