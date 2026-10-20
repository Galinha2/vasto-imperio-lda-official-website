import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isWorkbenchFrame, workbenchLevelPosition } from "../lib/workbench.mjs";

const catalog = JSON.parse(readFileSync(new URL("../assets/orcamento.json", import.meta.url))).produtos;

test("workbenches use existing picking frames up to one metre", () => {
  const frames = catalog.filter((p) => p.ref === 3 && p.produto.startsWith("Bastidor Picking"))
    .map((p) => ({ ...p, height: Number(p.produto.match(/(\d+)x\d+mm/)?.[1]) }));
  const selected = frames.filter(isWorkbenchFrame);
  assert.ok(selected.length > 0);
  assert.ok(selected.some((frame) => frame.height === 950));
  assert.ok(selected.some((frame) => frame.height === 1000));
  assert.equal(isWorkbenchFrame({ height: 1001 }), false);
  assert.equal(isWorkbenchFrame({ height: 0 }), false);
  assert.equal(isWorkbenchFrame({ height: NaN }), false);
});

test("single-level benches retain their worktop; two-level benches add a mid-height shelf", () => {
  const top = 80, height = 200, inset = 12;
  assert.equal(workbenchLevelPosition(0, 1, top, height, inset), 92);
  const worktop = workbenchLevelPosition(1, 2, top, height, inset);
  const lowerShelf = workbenchLevelPosition(0, 2, top, height, inset);
  assert.equal(worktop, 92);
  assert.equal(lowerShelf, 190);
  assert.ok(lowerShelf > worktop && lowerShelf < top + height);
});

test("three workbench levels have distinct lower, middle and worktop positions", () => {
  const positions = [0, 1, 2].map((index) => workbenchLevelPosition(index, 3, 80, 100, 12));
  assert.deepEqual(positions, [168, 135, 92]);
});
