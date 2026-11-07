import test from 'node:test';
import assert from 'node:assert/strict';
import {lightShelfPositions,lightBracePositions} from '../lib/light-shelf-layout.mjs';
import {rackModel} from '../lib/admin/rack-3d-model.mjs';
test('all light-duty shelf quantities avoid the complete brace band and preserve their count',()=>{
 for(const height of [1.5,2,2.5,3])for(let slots=2;slots<=11;slots++)for(const counts of [[0],[2],[3],[2,0,3]]){
  const levels=lightShelfPositions(height,slots,counts);
  assert.equal(levels.length,slots);
  for(const y of levels)for(const count of counts)for(const brace of lightBracePositions(height,count))assert.ok(y<brace-.085||y>brace+.11);
  for(let i=1;i<levels.length;i++)assert.ok(levels[i]-levels[i-1]>=.04999);
 }
});
test('3D uses the same safe layout as 2D, including removed shelves',()=>{
 const levels=lightShelfPositions(3,5,[3,0,3]);
 const m=rackModel({type:'ligeiras',height:3000,depth:500,modules:[1000,1000,750],slots:5,bracedIndexes:[0,2],braceCounts:[3,0,3],levelsByModule:[[0,2,4],[0,1,2,3,4],[1,3]]});
 assert.deepEqual(m.bays[0].levels,[levels[0],levels[2],levels[4]]);
 assert.deepEqual(m.bays[1].levels,levels);
 assert.deepEqual(m.bays[2].levels,[levels[1],levels[3]]);
});
