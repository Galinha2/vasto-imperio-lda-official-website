import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planSpace } from "../lib/space-planner.mjs";
import { spaceCatalog, estimateSpacePlan } from "../lib/space-catalog.mjs";
import { editSpacePlan, shelfKey, sharesStartFrame } from "../lib/space-plan-editing.mjs";
const models = spaceCatalog(JSON.parse(readFileSync(new URL("../assets/orcamento.json", import.meta.url))).produtos).filter((m) => m.type === "ligeiras");
const plan = planSpace({ width: 5, length: 3, height: 3, depth: 0.6, aisle: 1, doorWall: "bottom", doorOffset: 1.4, doorWidth: 1.2, center: false }, models).plans[0];

test("removing one shelf reduces count, occupied area and price without changing the proposal", () => {
  const original = JSON.stringify(plan);
  const removed = plan.shelves[0];
  const edited = editSpacePlan(plan, [shelfKey(removed)]);
  assert.equal(edited.shelves.length, plan.shelves.length - 1);
  assert.ok(edited.area < plan.area);
  assert.ok(estimateSpacePlan(edited, models).subtotal < estimateSpacePlan(plan, models).subtotal);
  assert.equal(JSON.stringify(plan), original);
  assert.equal(editSpacePlan(plan).shelves.length, plan.shelves.length);
});

test("excluding walls removes only the modules assigned to them, including rotated proposals", () => {
  for (const p of [plan, ...planSpace({ width: 5, length: 8, height: 3, depth: 0.6, aisle: 1, doorWall: "bottom", doorOffset: 1.4, doorWidth: 1.2, center: false }, models).plans.filter((p) => p.id.startsWith("horizontal"))]) {
    for (const wall of ["top", "bottom", "left", "right"]) {
      const edited = editSpacePlan(p, [], [wall]);
      assert.ok(edited.shelves.every((s) => s.wall !== wall));
      assert.equal(edited.shelves.length, p.shelves.filter((s) => s.wall !== wall).length);
    }
  }
});

test("all shelves can be removed and restored, with zero price for an empty drawing", () => {
  const empty = editSpacePlan(plan, plan.shelves.map(shelfKey));
  assert.equal(empty.shelves.length, 0);
  assert.equal(empty.runLength, 0);
  assert.equal(empty.area, 0);
  assert.equal(estimateSpacePlan(empty, models).total, 0);
  assert.equal(editSpacePlan(plan).shelves.length, plan.shelves.length);
});


test("drawing suppresses only the shared starting frame and restores it after removal", () => {
  for (const vertical of [false, true]) {
    const first = { x: 0, y: 0, w: vertical ? 0.6 : 2, h: vertical ? 2 : 0.6, height: 2.5, wall: vertical ? "left" : "top" };
    const next = { ...first, x: vertical ? 0 : 2, y: vertical ? 2 : 0 };
    assert.equal(sharesStartFrame(first, [next, first]), false);
    assert.equal(sharesStartFrame(next, [next, first]), true);
    assert.equal(sharesStartFrame(next, [next]), false);
    assert.equal(sharesStartFrame({ ...next, height: 2 }, [first]), false);
    assert.equal(sharesStartFrame({ ...next, x: next.x + 0.1 }, [first]), false);
  }
});

test('horizontal central rows keep their orientation and share the adjoining frame', async () => {
  const { topViewIsVertical, sharesStartFrame } = await import('../lib/space-plan-editing.mjs');
  const first = { x: 0, y: 2, w: 2, h: 0.6, depth: 0.6, runWidth: 2, height: 2, wall: 'center' };
  const second = { ...first, x: 2 };
  assert.equal(topViewIsVertical(first), false);
  assert.equal(sharesStartFrame(second, [first, second]), true);
  assert.equal(topViewIsVertical({ ...first, w: 0.6, h: 2 }), true);
});
