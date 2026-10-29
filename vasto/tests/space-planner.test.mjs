import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spaceCatalog, estimateSpacePlan } from "../lib/space-catalog.mjs";
import { planSpace, overlaps, doorClearance, packRun } from "../lib/space-planner.mjs";
const models = spaceCatalog(JSON.parse(readFileSync(new URL("../assets/orcamento.json", import.meta.url))).produtos);
const config = { width: 4, length: 8, height: 3, depth: 0.6, aisle: 1, doorWall: "bottom", doorOffset: 1.4, doorWidth: 1.2, center: false };

test("real catalogue generates both manual shelving families and a usable 4 × 8 plan", () => {
  assert.ok(models.some((m) => m.type === "picking"));
  assert.ok(models.some((m) => m.type === "ligeiras"));
  const result = planSpace(config, models.filter((m) => m.type === "picking"));
  assert.equal(result.error, "");
  assert.ok(result.plans.some((p) => p.shelves.length));
});

test("all four door walls retain a connected entrance spine without shelf overlap", () => {
  for (const doorWall of ["top", "bottom", "left", "right"]) for (const center of [false, true]) {
    const input = { ...config, width: 8, length: 10, doorWall, center };
    for (const plan of planSpace(input, models.filter((m) => m.type === "picking")).plans) {
      for (const [i, s] of plan.shelves.entries()) {
        assert.ok(s.x >= -1e-7 && s.y >= -1e-7);
        assert.ok(s.x + s.w <= input.width + 1e-7 && s.y + s.h <= input.length + 1e-7);
        assert.ok(s.height <= input.height - 0.2);
        assert.ok(!plan.reserved.some((r) => overlaps(s, r)));
        assert.ok(!plan.shelves.slice(i + 1).some((r) => overlaps(s, r)));
      }
      if (!center) assert.equal(plan.centralCount, 0);
    }
  }
});

test("central shelving appears only when requested and space permits", () => {
  assert.ok(planSpace({ ...config, width: 10, length: 10, center: true }, models).plans.some((p) => p.centralCount > 0));
  assert.ok(planSpace({ ...config, width: 2, length: 3, center: true }, models).plans.every((p) => p.centralCount === 0));
});

test("invalid room, impossible door and insufficient ceiling fail clearly", () => {
  assert.ok(planSpace({ ...config, doorOffset: 4 }, models).error);
  assert.ok(planSpace({ ...config, height: 1 }, models).error);
  assert.ok(planSpace({ ...config, width: NaN }, models).error);
  assert.ok(planSpace({ ...config, aisle: 0.2 }, models).error);
});


test("rack planner uses rack catalogue dimensions and retains the requested wider aisles", () => {
  const racks = models.filter((m) => m.type === "racks");
  assert.ok(racks.length);
  const input = { ...config, width: 8, length: 12, height: 6, aisle: 3.5, depth: racks[0].depth };
  const result = planSpace(input, racks);
  assert.equal(result.error, "");
  assert.ok(result.plans.some((p) => p.shelves.length));
  for (const plan of result.plans) for (const shelf of plan.shelves) assert.ok(!plan.reserved.some((r) => overlaps(shelf, r)));
});

test("5 × 3 m room uses both side walls while keeping entrance and all shelf frontages clear", () => {
  const input = { ...config, width: 5, length: 3, height: 2.2, depth: 0.5, doorOffset: 2, doorWidth: 1 };
  const plans = planSpace(input, models.filter((m) => m.type === "ligeiras")).plans;
  const best = plans[0];
  assert.ok(best.shelves.some((s) => s.x === 0));
  assert.ok(best.shelves.some((s) => Math.abs(s.x + s.w - 5) < 1e-7));
  assert.ok(best.shelves.some((s) => s.y === 0));
  assert.ok(best.shelves.some((s) => Math.abs(s.y + s.h - 3) < 1e-7));
  assert.ok(best.runLength > 4.2);
  for (const front of best.fronts) assert.ok(!best.shelves.some((s) => overlaps(s, front)));
});


test("catalogue estimate matches item totals, responds to levels and applies VAT once", () => {
  for (const type of ["ligeiras", "picking", "racks"]) {
    const catalog = models.filter((m) => m.type === type && (!m.material || m.material === "Aglomerado"));
    const input = { ...config, width: 8, length: 12, height: 6, depth: catalog[0].depth, aisle: type === "racks" ? 3.5 : 1 };
    const plan = planSpace(input, catalog).plans.find((p) => p.shelves.length);
    const estimate = estimateSpacePlan(plan, catalog, 4);
    assert.ok(estimate && estimate.subtotal > 0, type);
    const expected = estimate.parts.reduce((n, p) => n + Math.round(p.price * 100) * p.quantity, 0);
    assert.equal(Math.round(estimate.subtotal * 100), expected);
    assert.equal(Math.round(estimate.total * 100), expected + Math.round(expected * 0.23));
    assert.ok(estimateSpacePlan(plan, catalog, 5).subtotal > estimate.subtotal);
    assert.equal(estimateSpacePlan(plan, [], 4), null);
  }
});


test("door clearance extends only 1.5 metres inward on every wall", () => {
  for (const wall of ["top", "bottom", "left", "right"]) {
    const zone = doorClearance(5, 8, wall, 2, 1, 1);
    if (wall === "top" || wall === "bottom") {
      assert.equal(zone.h, 1.5);
      assert.equal(zone.y, wall === "top" ? 0 : 6.5);
    } else {
      assert.equal(zone.w, 1.5);
      assert.equal(zone.x, wall === "left" ? 0 : 3.5);
    }
    const input = { ...config, width: 5, length: 8, doorWall: wall, doorOffset: 2, doorWidth: 1 };
    for (const plan of planSpace(input, models).plans) for (const shelf of plan.shelves) assert.ok(!overlaps(zone, shelf));
  }
  assert.equal(doorClearance(3, 1.5, "top", 1, 1, 1).h, 1.5);
});

test("compact layouts fill corners at 90 degrees and outperform frontage-restricted layouts", () => {
  const input = { ...config, width: 5, length: 3, height: 3, depth: 0.6, doorOffset: 1.4, doorWidth: 1.2 };
  const plans = planSpace(input, models.filter((m) => m.type === "ligeiras")).plans;
  const best = plans[0];
  assert.ok(best.cornerAccessRestricted);
  assert.ok(best.runLength > Math.max(...plans.filter((p) => !p.cornerAccessRestricted).map((p) => p.runLength)));
  assert.ok(best.shelves.some((s) => Math.abs(s.x) < 1e-7 && Math.abs(s.y) < 1e-7));
  assert.ok(best.shelves.some((s) => Math.abs(s.x + s.w - 5) < 1e-7 && Math.abs(s.y + s.h - 3) < 1e-7));
  for (const [index, shelf] of best.shelves.entries()) {
    assert.ok(!best.reserved.some((zone) => overlaps(shelf, zone)));
    assert.ok(!best.shelves.slice(index + 1).some((other) => overlaps(shelf, other)));
  }
});


test("packing compares cost rather than assuming fewer bays are cheaper", () => {
  const costs = new Map([[2, 12000], [1, 4000]]);
  assert.deepEqual(packRun(4, [2, 1], costs), [1, 1, 1, 1]);
  assert.equal(packRun(5, [2.55]).length, 1, "two nominal 2.5 m bays need 5.10 m with upright allowances");
});

test("economic recommendation is cheaper within 5 percent of maximum storage length", () => {
  const catalog = models.filter((m) => m.type === "picking" && m.material === "Aglomerado");
  const input = { ...config, width: 5, length: 3, depth: 0.6, height: 3, levels: 4, material: "Aglomerado" };
  const maximum = planSpace({ ...input, optimization: "capacidade" }, catalog).plans[0];
  const economic = planSpace({ ...input, optimization: "economico" }, catalog).plans[0];
  assert.ok(economic.runLength >= maximum.runLength * 0.95 - 1e-7);
  assert.ok(estimateSpacePlan(economic, catalog, 4).subtotal <= estimateSpacePlan(maximum, catalog, 4).subtotal);
  for (const shelf of economic.shelves) assert.equal(shelf.height, maximum.height);
});


test("adjacent bays share frames; separated and perpendicular bays do not", () => {
  const model = models.find((m) => m.type === "racks");
  const shelf = { x: 0, y: 0, w: model.width, h: model.depth, wall: "top", runWidth: model.width, depth: model.depth, height: model.height };
  const frames = (shelves) => estimateSpacePlan({ shelves }, [model], 2).parts.find((p) => p.name === model.fixedParts[0].name).quantity;
  assert.equal(frames([shelf]), 2);
  assert.equal(frames([shelf, { ...shelf, x: model.width }]), 3);
  assert.equal(frames([shelf, { ...shelf, x: model.width }, { ...shelf, x: model.width * 2 }]), 4);
  assert.equal(frames([shelf, { ...shelf, x: model.width + 0.1 }]), 4);
  assert.ok(model.levelParts.every((p) => !/reforço/i.test(p.name)));
});

test("parallel-only plans preserve direction and the requested clear gap between rows", () => {
  for (const aisle of [0.8, 1.5, 2]) {
    const input = { ...config, width: 8, length: 10, center: true, parallelOnly: true, aisle, optimization: "economico" };
    const result = planSpace(input, models.filter((model) => model.type === "picking"));
    assert.ok(result.plans.length);
    for (const plan of result.plans) {
      assert.ok(!plan.id.startsWith("corners") && !plan.id.startsWith("perimeter"));
      const horizontal = plan.id.startsWith("horizontal");
      const coordinates = [...new Set(plan.shelves.map((shelf) => horizontal ? shelf.y : shelf.x))].sort((a, b) => a - b);
      for (let index = 1; index < coordinates.length; index++) assert.ok(coordinates[index] - coordinates[index - 1] - input.depth >= aisle - 1e-7);
      for (const shelf of plan.shelves) assert.ok(!plan.reserved.some((reserved) => overlaps(shelf, reserved)));
    }
  }
});

test("manual 18 by 13 layout places six 18m rows flush to side walls with equal gaps", () => {
  const input = { ...config, width: 18, length: 13, parallelOnly: true, rowLayout: "manual", rowDirection: "width", rowCount: 6, optimization: "economico" };
  const result = planSpace(input, models.filter((model) => model.type === "picking"));
  assert.equal(result.error, "");
  const plan = result.plans[0];
  const rows = [...new Set(plan.shelves.map((shelf) => shelf.y))].sort((a,b) => a-b);
  assert.equal(rows.length, 6);
  assert.equal(rows[0], 0);
  assert.ok(Math.abs(rows[5] + input.depth - 13) < 1e-7);
  for (let index = 1; index < rows.length; index++) assert.ok(Math.abs(rows[index] - rows[index-1] - input.depth - 1.88) < 1e-7);
  for (const shelf of plan.shelves) assert.ok(!plan.reserved.some((rect) => overlaps(shelf, rect)));
  assert.ok(plan.shelves.some((shelf) => shelf.central));
  assert.ok(planSpace({ ...input, rowCount: 20 }, models).error);
});

test("fixed module length uses only the chosen nominal beam size in all layouts", () => {
  const catalog = models.filter((model) => model.type === "picking");
  for (const parallelOnly of [false, true]) {
    const result = planSpace({ ...config, width: 18, length: 13, sameModuleLength: true, moduleLength: 2.5, parallelOnly, rowLayout: "manual", rowDirection: "width", rowCount: 6 }, catalog);
    assert.equal(result.error, "");
    assert.ok(result.plans[0].shelves.length);
    for (const plan of result.plans) for (const shelf of plan.shelves) assert.ok(Math.abs(shelf.runWidth - 2.55) < 0.001);
  }
});

test("apenas picking de 2750 mm usa três reforços centrais por nível", () => {
  for (const material of ["Aglomerado", "Metálica"]) {
    for (const width of [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75]) {
      const matches = models.filter(m => m.type === "picking" && m.material === material && m.nominalWidth === width);
      assert.ok(matches.length > 0);
      for (const model of matches) {
        const central = model.levelParts[3];
        assert.equal(central.quantity, width === 2.75 ? 3 : width <= 2 ? 1 : 2);
      }
    }
  }
});
