import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRackGeometry} from './rack-3d-geometry.mjs';

// Bake repeated fittings into ordinary meshes so both glTF and Apple's USDZ
// preserve every instance. All dimensions remain in metres, with the feet at Y=0.
export function createARScene(model){
 const source=createRackGeometry(model);const scene=new THREE.Scene();const geometries=[];
 try{
  source.group.updateMatrixWorld(true);
  let vertexCount=0;
  for(const batch of source.group.children)vertexCount+=batch.geometry.getAttribute('position').count*batch.count;
  if(vertexCount>3000000)throw new Error('AR_MODEL_TOO_LARGE');
  for(const batch of source.group.children){
   const parts=[];
   try{
    for(let i=0;i<batch.count;i++){
     const matrix=new THREE.Matrix4();batch.getMatrixAt(i,matrix);matrix.premultiply(batch.matrixWorld);
     const part=batch.geometry.clone().applyMatrix4(matrix);parts.push(part);
    }
    const merged=mergeGeometries(parts,false);if(!merged)throw new Error('AR_GEOMETRY_FAILED');
    geometries.push(merged);const mesh=new THREE.Mesh(merged,batch.material);mesh.name=batch.name;scene.add(mesh);
   }finally{parts.forEach(part=>part.dispose());}
  }
  return {scene,dispose:()=>{geometries.forEach(g=>g.dispose());source.dispose();}};
 }catch(error){geometries.forEach(g=>g.dispose());source.dispose();throw error;}
}
