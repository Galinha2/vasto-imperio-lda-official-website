import * as THREE from 'three';
import {shelfReinforcementPositions} from './rack-3d-model.mjs';

// Repeated small fittings are instanced to keep rotation responsive on phones.
export function createRackGeometry(model,{woodTexture=null,zincTexture=null}={}){
 const group=new THREE.Group();group.position.x=-model.width/2;
 const resources=new Set();const cache=new Map();const batches=new Map();
 const material=(name,color,metalness,roughness,map=null)=>{const m=new THREE.MeshStandardMaterial({name,color,metalness,roughness,map});resources.add(m);return m;};
 const light=model.type==='ligeiras',rack=model.type==='racks';
 const mats={
  zinc:material('Aço galvanizado',0xbcc5cc,.68,.43,zincTexture),
  upright:material(light?'Pintura cinzenta clara':model.galvanized?'Montante galvanizado':'Pintura azul',light?0xc9cfca:model.galvanized?0xbcc5cc:0x0676bb,model.galvanized?.65:.32,model.galvanized?.43:.3,model.galvanized?zincTexture:null),
  beam:material(rack?'Viga laranja':'Viga cinzenta clara',rack?0xe87820:0xbdc5c0,.34,.35),
  connector:material('Chapa de encaixe',rack?0xe87820:0xcbd0ce,.48,.35),
  wood:material('Tampo aglomerado',0xbda47e,.03,.86,woodTexture),
  metal:material('Tampo metálico',0xd3d7d3,.4,.38),
  bolt:material('Parafusos zincados',0xd5dce0,.75,.28),
  plastic:material('Pés de proteção',0x252b30,.02,.82),
 };
 function geometry(key,make){if(!cache.has(key)){const g=make();resources.add(g);cache.set(key,g);}return cache.get(key);}
 const dummy=new THREE.Object3D();
 function put(name,geo,mat,x,y,z,rotation=null){const key=name+'|'+geo.uuid+'|'+mat.uuid;if(!batches.has(key))batches.set(key,{name,geo,mat,matrices:[]});dummy.position.set(x,y,z);dummy.rotation.set(...(rotation||[0,0,0]));dummy.scale.set(1,1,1);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());}
 function box(name,w,h,d,x,y,z,mat,rotation){if(w<=0||h<=0||d<=0)return;const g=geometry(`box:${w}:${h}:${d}`,()=>new THREE.BoxGeometry(w,h,d));put(name,g,mat,x,y,z,rotation);}
 function bolt(x,y,z,axis='z'){const g=geometry('bolt',()=>new THREE.CylinderGeometry(.004,.004,.004,6));put('Parafuso sextavado',g,mats.bolt,x,y,z,axis==='x'?[0,0,Math.PI/2]:[Math.PI/2,0,0]);}
 function brace(a,b){const delta=new THREE.Vector3().subVectors(b,a);const center=a.clone().add(b).multiplyScalar(.5);const g=geometry(`brace:${delta.length()}`,()=>new THREE.BoxGeometry(.017,delta.length(),.025));const rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()));put('Diagonal galvanizada',g,mats.zinc,...center.toArray(),rotation.toArray().slice(0,3));for(const p of [a,b])bolt(p.x+.013,p.y,p.z,'x');}
 const thickness=light?.0015:.002;
 function perforatedWeb(){const w=model.upright,h=model.height;
  return geometry(`perforated:${w}:${h}:${light}`,()=>{
   const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(-w/2,h);shape.closePath();
   const pitch=light?.035:.05,holeW=light?.005:rack?.012:.009,holeH=light?.015:.018;
   const columns=light?[0]:[-w*.24,w*.24];
   for(let y=.05;y<h-.025;y+=pitch)for(const x of columns){const hole=new THREE.Path();hole.moveTo(x-holeW/2,y-holeH/2);hole.lineTo(x-holeW/2,y+holeH/2);hole.lineTo(x+holeW/2,y+holeH/2);hole.lineTo(x+holeW/2,y-holeH/2);hole.closePath();shape.holes.push(hole);}
   return new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1});
  });
 }
 const positions=[model.bays[0].left,...model.bays.map(b=>b.right)];
 positions.forEach(x=>{
  for(const z of [-model.depth/2,model.depth/2]){
   const inward=z>0?-1:1,profileDepth=light?.025:.04;
   put('Montante com perfuração',perforatedWeb(),mats.upright,x,0,z,[0,z>0?0:Math.PI,0]);
   for(const edge of light?[-1]:[-1,1]){box('Aba do montante',thickness,model.height,profileDepth,x+edge*(model.upright/2-thickness/2),model.height/2,z+inward*profileDepth/2,mats.upright);if(!light)box('Retorno do perfil',.009,model.height,thickness,x+edge*(model.upright/2-.0045),model.height/2,z+inward*profileDepth,mats.upright);}
   if(light)box('Pé plástico',model.upright+.004,.018,profileDepth+.012,x,.009,z+inward*.008,mats.plastic);
   else{box('Chapa de base',model.upright+.05,.005,.105,x,.003,z,mats.zinc);box('Reforço do pé',model.upright+.008,.09,.005,x,.05,z+inward*.008,mats.zinc);bolt(x-model.upright*.3,.04,z+inward*.013);bolt(x+model.upright*.3,.04,z+inward*.013);}
  }
  if(light){
   // Frame ties join the front and rear posts at the top, middle and above the rubber feet.
   box('Barra horizontal superior do bastidor',.018,.03,model.depth-.004,x,model.height-.025,0,mats.upright);
   box('Barra horizontal central do bastidor',.018,.03,model.depth-.004,x,model.height/2,0,mats.upright);
   box('Barra horizontal inferior do bastidor',.018,.03,model.depth-.004,x,.065,0,mats.upright);
  }
  if(!light){
   const lo=.12,hi=model.height-.08,segments=Math.max(1,Math.ceil((hi-lo)/.7));const step=(hi-lo)/segments;
   box('Travessa inferior',.024,.024,model.depth-.04,x,lo,0,mats.zinc);box('Travessa superior',.024,.024,model.depth-.04,x,hi,0,mats.zinc);
   for(let i=0;i<segments;i++){const a=new THREE.Vector3(x,lo+i*step,(i%2===0?-1:1)*(model.depth/2-.024));const b=new THREE.Vector3(x,lo+(i+1)*step,(i%2===0?1:-1)*(model.depth/2-.024));brace(a,b);}
  }
 });
 model.bays.forEach(b=>{
  if(light)for(const y of b.horizontalBraces){
   const z=-model.depth/2-.004,center=(b.left+b.right)/2;
   box('Travamento horizontal traseiro',b.clearLength,.15,.002,center,y,z,mats.metal);
   for(const side of [-1,1])box('Aba do travamento horizontal',b.clearLength,.002,.012,center,y+side*.074,z+.005,mats.metal);
   for(const end of [b.left+model.upright/2+.012,b.right-model.upright/2-.012]){bolt(end,y-.05,z-.004);bolt(end,y+.05,z-.004);}
  }
  b.levels.forEach(y=>{
   const center=(b.left+b.right)/2,span=b.clearLength;
   for(const z of [-model.depth/2,model.depth/2]){
    const sign=z>0?1:-1;const bh=model.beamHeight;
    // Folded beam faces, top shelf seat and bottom return are distinct surfaces.
    box('Alma da viga',span,bh,.003,center,y-bh/2,z,mats.beam);
    box('Aba superior da viga',span,.003,.04,center,y-.0015,z-sign*.018,mats.beam);
    box('Retorno inferior da viga',span,.003,.035,center,y-bh+.0015,z-sign*.015,mats.beam);
    if(!light){box('Nervura longitudinal',span,.009,.006,center,y-bh*.62,z+sign*.003,mats.beam);
     for(const end of [b.left+model.upright/2,b.right-model.upright/2]){
      box('Chapa de encaixe da viga',.038,bh*1.45,.006,end,y-bh*.55,z+sign*.004,mats.connector);
      for(const offset of [.18,.65,1.08])bolt(end,y-bh*offset,z+sign*.009);
      box('Freio de segurança',.009,.012,.014,end+.012,y-.006,z+sign*.014,mats.bolt);
     }
    }
   }
   if(!rack){
    const wood=!light&&model.floorType==='Aglomerado';const shelfMat=wood?mats.wood:mats.metal;
    const overhang=model.type==='bancadas'&&y===Math.max(...b.levels)?.035:0;
    const panels=light?1:Math.max(1,Math.ceil(span/1.05));const panelWidth=(span+overhang*2)/panels;
    const deckDepth=model.type==='bancadas'?model.depth+.025+overhang*2:model.depth-.008;
    for(let panel=0;panel<panels;panel++)box(wood?'Painel de aglomerado':'Tampo metálico',panelWidth-.002,wood?.018:.012,deckDepth,b.left+model.upright/2-overhang+(panel+.5)*panelWidth,y+(wood?.009:.006),0,shelfMat);
    if(!light){
     const supports=shelfReinforcementPositions(b,model.upright);
     for(const x of supports.lateral)box('Reforço lateral do tampo',.025,.04,model.depth-.04,x,y-.02,0,mats.zinc);
     for(const x of supports.central)box('Reforço central do tampo',.025,.04,model.depth-.04,x,y-.02,0,mats.zinc);
    }
    if(light)for(let rib=1;rib<=model.shelfRibCount;rib++){
     const z=-model.depth/2+model.depth*rib/(model.shelfRibCount+1);
     // Folded underside stiffener: runs along X (shelf length), not across its depth.
     // It is part of the metal deck, using its exact material and finish.
     box('Reforço longitudinal integrado',span-.012,.0015,.04,center,y-.012,z,mats.metal);
     for(const side of [-1,1])box('Aba do reforço integrado',span-.012,.012,.0015,center,y-.006,z+side*.01925,mats.metal);
    }
    if(light){for(const z of [-model.depth/2,model.depth/2])box('Borda dobrada da prateleira',span,.025,.002,center,y-.012,z,mats.metal);for(const x of [b.left+model.upright/2,b.right-model.upright/2])box('Borda lateral da prateleira',.002,.025,model.depth,x,y-.012,0,mats.metal);}
   }
  });
 });
 for(const {name,geo,mat,matrices} of batches.values()){const mesh=new THREE.InstancedMesh(geo,mat,matrices.length);mesh.name=name;matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 return {group,materials:mats,dispose:()=>resources.forEach(r=>r.dispose())};
}
