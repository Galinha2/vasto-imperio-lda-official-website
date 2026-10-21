import test from "node:test";
import assert from "node:assert/strict";
import { remainingLevels, editLevels, levelClearance } from "../lib/editable-levels.mjs";
test("removing a middle level preserves the others and doubles the height interval", () => {
  const state = editLevels({ slots:4, removed:[] }, { type:"remove", index:1 });
  assert.deepEqual(remainingLevels(state), [0,2,3]);
  assert.equal(levelClearance(0,2,1000,100),1900);
  assert.equal(levelClearance(2,3,1000,100),900);
});
test("removing extreme levels leaves their original slot indices and allows restoring", () => {
  let state = editLevels({ slots:4, removed:[] }, { type:"remove", index:0 });
  state = editLevels(state,{ type:"remove", index:3 });
  assert.deepEqual(remainingLevels(state),[1,2]);
  assert.deepEqual(remainingLevels(editLevels(state,{type:"restore"})),[0,1,2,3]);
  assert.deepEqual(remainingLevels(editLevels(state,{type:"set",count:5})),[0,1,2,3,4]);
});
test("a row keeps at least one level and repeated or invalid removals are ignored", () => {
  let state={slots:2,removed:[]};
  state=editLevels(state,{type:"remove",index:0});
  assert.equal(editLevels(state,{type:"remove",index:1}),state);
  assert.equal(editLevels(state,{type:"remove",index:0}),state);
  assert.equal(editLevels(state,{type:"remove",index:9}),state);
});

test('removing one module level preserves every other module and original level positions', async () => {
  const { moduleLevels, removeModuleLevel } = await import('../lib/editable-levels.mjs');
  const initial = { slots: 4, modules: {} };
  const updated = removeModuleLevel(initial, 1, 0);
  assert.deepEqual(moduleLevels(updated, 0), [0, 1, 2, 3]);
  assert.deepEqual(moduleLevels(updated, 1), [1, 2, 3]);
  assert.deepEqual(moduleLevels(updated, 2), [0, 1, 2, 3]);
  assert.deepEqual(moduleLevels(initial, 1), [0, 1, 2, 3]);
  const counts = [0, 1, 2].map((index) => moduleLevels(updated, index).length);
  assert.equal(counts.reduce((sum, count) => sum + count * 2, 0), 22); // 24 original beams, only one pair removed.
  assert.equal(counts.reduce((sum, count) => sum + count * 4, 0), 44); // Only the four matching safety brakes removed.
});
test('module level edits reject invalid targets and keep at least one level per module', async () => {
  const { moduleLevels, removeModuleLevel } = await import('../lib/editable-levels.mjs');
  const initial = { slots: 3, modules: {} };
  let updated = removeModuleLevel(initial, 0, 1);
  assert.equal(removeModuleLevel(updated, 0, 1), updated);
  updated = removeModuleLevel(updated, 0, 2);
  assert.deepEqual(moduleLevels(updated, 0), [0]);
  assert.equal(removeModuleLevel(updated, 0, 0), updated);
  assert.equal(removeModuleLevel(updated, -1, 0), updated);
  assert.deepEqual(moduleLevels(updated, 1), [0, 1, 2]);
});

test('external dimension columns combine identical modules and distinguish edited profiles', async () => {
  const { levelDimensionGroups } = await import('../lib/editable-levels.mjs');
  assert.deepEqual(levelDimensionGroups([1000, 1000, 1000], (index) => index === 1 ? [1, 3] : [0, 1, 2, 3]), [
    { levels: [0, 1, 2, 3], moduleIndexes: [0, 2] },
    { levels: [1, 3], moduleIndexes: [1] },
  ]);
});
