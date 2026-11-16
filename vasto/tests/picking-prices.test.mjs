import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spaceCatalog } from "../lib/space-catalog.mjs";

const catalog = JSON.parse(readFileSync(new URL("../assets/orcamento.json", import.meta.url))).produtos;
// Audited against the exact supplier code / PVP row in the 2026 PDF (pages 30–39 and 42).
const audit = readFileSync(new URL("../docs/picking-precos-evoracks-2026-01.csv", import.meta.url), "utf8")
  .trimEnd().split(/\r?\n/).slice(1).map(row => row.split(";"));

test("every picking article matches its audited price, including additions and unlisted special frames", () => {
  const picking = catalog.filter(product => product.ref === 3);
  assert.equal(picking.length, 360);
  assert.equal(audit.length, picking.length);
  assert.equal(new Set(audit.map(row => row[0])).size, picking.length);
  for (const [name, , , , current, status] of audit) {
    const matches = picking.filter(product => product.produto === name);
    assert.equal(matches.length, 1, name);
    assert.equal(matches[0]["preço"], status === "Sob consulta" ? null : Number(current), name);
    assert.equal(!!matches[0].priceOnRequest, status === "Sob consulta", name);
  }
});

test("supplier freio pack is converted to individual units for four brakes per level", () => {
  const brake = catalog.find(product => product.produto === "Freio de segurança Picking");
  assert.equal(brake.supplierUnitsPerPack, 2);
  assert.equal(brake["preço"], 0.22);
  assert.equal(Math.round(brake["preço"] * 4 * 100), 88);
  const anchors = catalog.find(product => product.produto === "Bucha metálica Picking M8x75 (2 unidades)");
  assert.equal(anchors["preço"], 4.47, "anchors are explicitly sold as a pack of two");
});

test("metal shelves marked Consultar cannot create an automatically priced space model", () => {
  // The space planner uses Z60 beams. Supply a test-only 2600 mm beam so that
  // missing prices, rather than the absence of a Z60 price, must exclude the shelf.
  const beam2600 = catalog.find(product => product.produto.startsWith("Viga Z100 c/ 2600mm"));
  const models = spaceCatalog([...catalog, { ...beam2600, produto: beam2600.produto.replace("Z100", "Z60") }])
    .filter(model => model.type === "picking" && model.material === "Metálica");
  for (const depth of [0.4, 0.5, 0.8]) {
    assert.ok(!models.some(model => model.nominalWidth === 2.6 && model.depth === depth));
  }
  assert.ok(models.some(model => model.nominalWidth === 2.6 && model.depth === 0.6));
  assert.ok(models.every(model => [...model.fixedParts, ...model.levelParts].every(part => Number.isFinite(part.price) && part.price > 0)));
});
