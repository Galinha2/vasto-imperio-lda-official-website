import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rackModel} from '../lib/admin/rack-3d-model.mjs';
import {createARScene} from '../lib/admin/rack-ar-export.mjs';
import {createRackGeometry} from '../lib/admin/rack-3d-geometry.mjs';

test('AR bakes every repeated fitting into exportable meshes without changing metre dimensions',()=>{
 for(const type of ['picking','racks','ligeiras','bancadas']){
  const model=rackModel({type,modules:[1000,1500],height:2000,depth:600,slots:2,bracedIndexes:[0]});
  const source=createRackGeometry(model),asset=createARScene(model);
  try{
   assert.ok(asset.scene.children.length>0);
   assert.ok(asset.scene.children.every(mesh=>mesh.isMesh&&!mesh.isInstancedMesh));
   const expected=new THREE.Box3().setFromObject(source.group),actual=new THREE.Box3().setFromObject(asset.scene);
   for(const axis of ['x','y','z']){
    assert.ok(Math.abs(expected.min[axis]-actual.min[axis])<1e-5);
    assert.ok(Math.abs(expected.max[axis]-actual.max[axis])<1e-5);
   }
  }finally{source.dispose();asset.dispose();}
 }
});
