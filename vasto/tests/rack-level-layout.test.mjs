import test from 'node:test';import assert from 'node:assert/strict';
import {rackBeamLevels} from '../lib/rack-level-layout.mjs';
import {rackModel} from '../lib/admin/rack-3d-model.mjs';
test('rack levels have equal spacing anchored at the top, leaving the remainder below',()=>{
 for(const height of [2,2.5,3,4,5,6])for(let slots=2;slots<=10;slots++){
  const ys=rackBeamLevels(height,slots),gap=ys[1]-ys[0];
  assert.ok(Math.abs(ys.at(-1)-(height-.125))<1e-9);
  assert.ok(ys[0]>=.1-1e-9);
  for(let i=1;i<ys.length;i++)assert.ok(Math.abs(ys[i]-ys[i-1]-gap)<1e-9);
 }
});
test('3D uses the same rack heights as 2D and keeps removed levels absent',()=>{
 const ys=rackBeamLevels(4,4);
 const m=rackModel({type:'racks',modules:[2700],height:4000,depth:1000,slots:4,levelsByModule:[[0,2,3]]});
 assert.deepEqual(m.bays[0].levels,[ys[0],ys[2],ys[3]]);
});
