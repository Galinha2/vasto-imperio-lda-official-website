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
