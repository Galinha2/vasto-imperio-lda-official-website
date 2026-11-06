import test from 'node:test';import assert from 'node:assert/strict';import {rackModel} from '../lib/admin/rack-3d-model.mjs';
test('mixed modules share frames and preserve individual level removals',()=>{const m=rackModel({modules:[1500,2750],height:2500,depth:800,slots:4,levelsByModule:[[0,2,3],[1,3]]});assert.equal(m.height,2.5);assert.equal(m.depth,.8);assert.equal(m.bays[0].right,m.bays[1].left);assert.equal(m.bays[0].levels.length,3);assert.equal(m.bays[1].levels.length,2);assert.ok(m.bays.every(b=>b.levels.every(y=>y>=0&&y<=m.height)));assert.ok(Math.abs(m.width-4.3)<1e-10);});
test('removed shelf remains absent; racks remain racks; invalid dimensions rejected',()=>{assert.equal(rackModel({modules:[2000],height:3000,depth:1000,levelsByModule:[[]],type:'racks'}).bays[0].levels.length,0);assert.equal(rackModel({modules:[],height:1000,depth:600}),null);assert.equal(rackModel({modules:[NaN],height:1000,depth:600}),null);assert.equal(rackModel({modules:[1000],height:-1,depth:600}),null);});

test('overall dimensions follow the simulator envelopes for each family',()=>{
 const light=rackModel({modules:[1000,750],height:2000,depth:400,type:'ligeiras'});assert.equal(light.width,1.75);
 const racks=rackModel({modules:[1800,2700],height:3000,depth:1000,type:'racks'});assert.ok(Math.abs(racks.width-4.8)<1e-10);
 const bench=rackModel({modules:[1500],height:1000,depth:600,type:'bancadas',slots:3});assert.ok(bench.bays[0].levels[0]<bench.bays[0].levels[1]);assert.ok(bench.bays[0].levels[1]<bench.bays[0].levels[2]);
 const reinforced=rackModel({modules:[2750],height:2500,depth:800,reinforcedBeams:true});assert.equal(reinforced.beamHeight,.1);assert.equal(reinforced.bays[0].centralSupports,3);
});

test('Picking top deck finishes flush with the frame for wood and metal finishes',()=>{
 for(const floorType of ['Aglomerado','Metálica'])for(const reinforcedBeams of [false,true]){
  const model=rackModel({modules:[1500],height:2500,depth:800,slots:4,type:'picking',floorType,reinforcedBeams});
  assert.ok(Math.abs(Math.max(...model.bays[0].levels)-model.height)<1e-9);
 }
});
