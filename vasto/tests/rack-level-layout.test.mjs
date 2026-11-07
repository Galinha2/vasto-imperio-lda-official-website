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

test('loaded pallets reserve a floor position when all beam intervals have room',()=>{
 for(const slots of [1,2,3,4,5]){
  const height=(slots+1)*1.4,ys=rackBeamLevels(height,slots,1);
  assert.ok(ys[0]>=1.2);for(let i=1;i<ys.length;i++)assert.ok(ys[i]-ys[i-1]>=1.2-1e-9);
  const model=rackModel({type:'racks',modules:[2700],height:height*1000,depth:1000,slots,useRequirements:{pallet:'EUR 1200 × 800 mm',loadHeight:'1000'}});
  assert.equal(model.bays[0].floorPallets,true);assert.deepEqual(model.bays[0].levels,ys);
 }
 const crowded=rackModel({type:'racks',modules:[2700],height:2000,depth:1000,slots:4,useRequirements:{pallet:'EUR 1200 × 800 mm',loadHeight:'1500'}});
 assert.equal(crowded.bays[0].floorPallets,false);
});
