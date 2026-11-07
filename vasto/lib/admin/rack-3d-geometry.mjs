import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {shelfReinforcementPositions} from './rack-3d-model.mjs';

// Repeated small fittings are instanced to keep rotation responsive on phones.
export function createRackGeometry(model,{woodTexture=null,zincTexture=null}={}){
 const group=new THREE.Group();group.position.x=-model.width/2;
 const resources=new Set();const cache=new Map();const batches=new Map();
 const material=(name,color,metalness,roughness,map=null)=>{const m=new THREE.MeshPhysicalMaterial({name,color,metalness,roughness,map,clearcoat:metalness<.5&&roughness<.5?.22:0,clearcoatRoughness:.35});resources.add(m);return m;};
 const light=model.type==='ligeiras',rack=model.type==='racks';
 const mats={
  zinc:material('Aço galvanizado',0xbcc5cc,.68,.43,zincTexture),
  upright:material(light?'Pintura cinzenta clara':model.galvanized?'Montante galvanizado':'Pintura azul',light?0xc9cfca:model.galvanized?0xbcc5cc:0x0676bb,model.galvanized?.65:.32,model.galvanized?.43:.3,model.galvanized?zincTexture:null),
  beam:material(rack?'Viga laranja':'Viga cinzenta clara',rack?0xe87820:0xbdc5c0,.34,.35),
  connector:material('Chapa de encaixe',rack?0xe87820:0xcbd0ce,.48,.35),
  wood:material('Tampo aglomerado',0xbda47e,.03,.86,woodTexture),
  metal:material('Tampo metálico',0xd3d7d3,.4,.38),
  shelfRib:material('Reforço integrado cinzento claro',0xe1e4e0,.4,.38),
  pallet:material('Madeira de palete',0xb99a6f,.02,.85),
  cargo:material('Carga ilustrativa',0xcbbda4,.01,.9),
  guard:material('Proteção solicitada',0xefb52c,.25,.38),
  tie:material('Travamento cinzento',0xaeb8b2,.3,.48),
  bolt:material('Parafusos zincados',0xd5dce0,.75,.28),
  plastic:material('Pés de proteção branco suave',0xeeefe9,.02,.82),
 };
 function geometry(key,make){if(!cache.has(key)){const g=make();resources.add(g);cache.set(key,g);}return cache.get(key);}
 const dummy=new THREE.Object3D();
 function put(name,geo,mat,x,y,z,rotation=null){const key=name+'|'+geo.uuid+'|'+mat.uuid;if(!batches.has(key))batches.set(key,{name,geo,mat,matrices:[]});dummy.position.set(x,y,z);dummy.rotation.set(...(rotation||[0,0,0]));dummy.scale.set(1,1,1);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());}
 function box(name,w,h,d,x,y,z,mat,rotation){if(w<=0||h<=0||d<=0)return;const g=geometry(`box:${w}:${h}:${d}`,()=>{const g=new RoundedBoxGeometry(w,h,d,1,Math.min(.0012,w/5,h/5,d/5));g.parameters={...g.parameters,width:w,height:h,depth:d};return g;});put(name,g,mat,x,y,z,rotation);}
 function bolt(x,y,z,axis='z'){
  const rotation=axis==='x'?[0,0,Math.PI/2]:[Math.PI/2,0,0];
  const g=geometry('bolt',()=>new THREE.CylinderGeometry(.004,.004,.004,6));
  put('Parafuso sextavado',g,mats.bolt,x,y,z,rotation);
  const washer=geometry('washer',()=>new THREE.CylinderGeometry(.006,.006,.001,16));
  put('Anilha zincada',washer,mats.bolt,x-(axis==='x'?.0025:0),y,z-(axis==='z'?.0025:0),rotation);
 }
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
   const inward=z>0?-1:1,profileDepth=light?model.upright:.04;
   if(light){
    // Stamped outward-facing tongues, as in the light-duty frame photograph.
    const sideX=x-model.upright/2;
    // Open C-section: continuous inward-facing channel, with small return lips.
    box('Parede traseira do montante ligeiro',thickness,model.height,model.upright,sideX+profileDepth,model.height/2,z+inward*model.upright/2,mats.upright);
    for(const edge of [sideX+.003,sideX+profileDepth-.003])box('Rebordo do canal aberto do montante',.006,model.height,thickness,edge,model.height/2,z+inward*model.upright,mats.upright);
    box('Montante com encaixes salientes',thickness,model.height,model.upright,sideX,model.height/2,z+inward*model.upright/2,mats.upright);
    const tongue=geometry('light-stamped-tongue',()=>{
     const section=new THREE.Shape();
     section.moveTo(0,0);section.lineTo(-.004,.004);section.lineTo(-.004,.014);section.lineTo(0,.018);
     section.lineTo(.001,.018);section.lineTo(-.0025,.0135);section.lineTo(-.0025,.0045);section.lineTo(.001,0);section.closePath();
     return new THREE.ExtrudeGeometry(section,{depth:.008,bevelEnabled:false,curveSegments:1});
    });
    for(let tabY=.05;tabY<model.height-.025;tabY+=.05){
     put('Patilha saliente do bastidor',tongue,mats.upright,sideX-.00075,tabY,z+inward*model.upright/2-.004);
     put('Patilha saliente traseira do bastidor',tongue,mats.upright,sideX+profileDepth+.00075,tabY,z+inward*model.upright/2+.004,[0,Math.PI,0]);
    }
    box('Aba do montante',profileDepth,model.height,thickness,x-model.upright/2+profileDepth/2,model.height/2,z,mats.upright);
   }else{
    put('Montante com perfuração',perforatedWeb(),mats.upright,x,0,z,[0,z>0?0:Math.PI,0]);
    for(const edge of [-1,1]){box('Aba do montante',thickness,model.height,profileDepth,x+edge*(model.upright/2-thickness/2),model.height/2,z+inward*profileDepth/2,mats.upright);box('Retorno do perfil',.009,model.height,thickness,x+edge*(model.upright/2-.0045),model.height/2,z+inward*profileDepth,mats.upright);}
   }
   if(rack&&z>0&&model.useRequirements?.protection){
    box('Proteção de pilar solicitada',model.upright+.06,.35,.008,x,.175,z+.07,mats.guard);
    for(const side of [-1,1])box('Aba da proteção solicitada',.008,.35,.12,x+side*(model.upright/2+.03),.175,z+.014,mats.guard);
   }
   if(light){
    box('Pé plástico',model.upright+.004,.018,profileDepth+.012,x,.009,z+inward*.008,mats.plastic);
    box('Rebordo do pé plástico',model.upright+.007,.003,profileDepth+.015,x,.017,z+inward*.008,mats.plastic);
   }
   else{box('Chapa de base',model.upright+.05,.005,.105,x,.003,z,mats.zinc);box('Reforço do pé',model.upright+.008,.09,.005,x,.05,z+inward*.008,mats.zinc);bolt(x-model.upright*.3,.04,z+inward*.013);bolt(x+model.upright*.3,.04,z+inward*.013);}
  }
  if(light){
   // Frame ties join the front and rear posts at the top, middle and above the rubber feet.
   box('Barra horizontal superior do bastidor',.03,.03,model.depth-.004,x,model.height-.015,0,mats.upright);
   box('Barra horizontal central do bastidor',.03,.03,model.depth-.004,x,model.height/2,0,mats.upright);
   box('Barra horizontal inferior do bastidor',.03,.03,model.depth-.004,x,.065,0,mats.upright);
  }
  if(!light){
   const lo=.12,hi=model.height-.08,segments=Math.max(1,Math.ceil((hi-lo)/.7));const step=(hi-lo)/segments;
   box('Travessa inferior',.024,.024,model.depth-.04,x,lo,0,mats.zinc);box('Travessa superior',.024,.024,model.depth-.04,x,hi,0,mats.zinc);
   for(let i=0;i<segments;i++){const a=new THREE.Vector3(x,lo+i*step,(i%2===0?-1:1)*(model.depth/2-.024));const b=new THREE.Vector3(x,lo+(i+1)*step,(i%2===0?1:-1)*(model.depth/2-.024));brace(a,b);}
  }
 });
 model.bays.forEach(b=>{
  if(light)for(const y of b.horizontalBraces){
   const z=-model.depth/2-.002,center=(b.left+b.right)/2;
   // Four subtly creased facets meet at a slightly recessed centre: stamped X in one sheet.
   const tieGeometry=geometry(`embossed-tie:${b.clearLength}`,()=>{
    const w=b.clearLength/2,h=.075;
    const vertices=[[-w,-h,-.0015],[w,-h,-.0015],[w,h,-.0015],[-w,h,-.0015],[0,0,-.008],[-w,-h,.0015],[w,-h,.0015],[w,h,.0015],[-w,h,.0015],[0,0,-.005]];
    const faces=[[0,4,1],[1,4,2],[2,4,3],[3,4,0],[5,6,9],[6,7,9],[7,8,9],[8,5,9],[0,1,6],[0,6,5],[1,2,7],[1,7,6],[2,3,8],[2,8,7],[3,0,5],[3,5,8]];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(face=>face.flatMap(i=>vertices[i])),3));g.computeVertexNormals();return g;
   });
   put('Travamento horizontal traseiro',tieGeometry,mats.tie,center,y,z);
   for(const side of [-1,1]){
    const hook=geometry(`tie-end-hook:${side}`,()=>{
     // Curved end return wraps towards the frame's stamped mounting tongue.
     const shape=new THREE.Shape();shape.moveTo(0,0);
     shape.lineTo(side*.006,0);shape.quadraticCurveTo(side*.012,0,side*.012,.006);
     shape.lineTo(side*.012,.019);shape.lineTo(side*.009,.019);shape.lineTo(side*.009,.006);
     shape.quadraticCurveTo(side*.009,.003,side*.006,.003);shape.lineTo(0,.003);shape.closePath();
     return new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:false,curveSegments:6});
    });
    put('Aba curva lateral do travamento',hook,mats.tie,center+side*b.clearLength/2,y+.065,z,[Math.PI/2,0,0]);
   }
  }
  function drawPallets(y){
   const center=(b.left+b.right)/2;
   if(rack&&b.palletLoad){
    const load=b.palletLoad;
    for(const offset of load.centres){
     const px=center+offset,w=load.width,d=load.depth;
     // Euro pallet: five top boards, three bottom runners and nine spacer blocks.
     const boardWidths=w===.8?[.145,.1,.145,.1,.145]:Array(5).fill(.145);
     const boardGap=(w-boardWidths.reduce((sum,bw)=>sum+bw,0))/4;let boardX=px-w/2;
     for(const bw of boardWidths){box('Tábua superior da palete',bw,.022,d,boardX+bw/2,y+.133,0,mats.pallet);boardX+=bw+boardGap;}
     for(const sx of [-1,0,1]){
      box('Patim inferior da palete',.1,.022,d,px+sx*(w/2-.05),y+.011,0,mats.pallet);
      for(const sz of [-1,0,1])box('Bloco da palete',.1,.078,.14,px+sx*(w/2-.05),y+.061,sz*(d/2-.07),mats.pallet);
     }
     for(const sz of [-1,0,1])box('Travessa da palete',w,.022,.14,px,y+.111,sz*(d/2-.07),mats.pallet);
     if(load.loadHeight>load.palletHeight){
      const ch=load.loadHeight-load.palletHeight;
      box('Carga ilustrativa sobre palete',w-.04,ch,d-.04,px,y+load.palletHeight+ch/2,0,mats.cargo);
     }
    }
   }
  }
  if(b.floorPallets)drawPallets(0);
  b.levels.forEach(y=>{
   const center=(b.left+b.right)/2,span=b.clearLength;
   for(const z of [-model.depth/2,model.depth/2]){
    const sign=z>0?1:-1;const bh=model.beamHeight;
    if(model.type==='picking'||rack){
     // Closed solid beam volume, including inner face and end caps.
     const beamDepth=model.type==='picking'?.025:.04;
     box('Corpo sólido da viga',span,bh,beamDepth,center,y-bh/2,z-sign*(beamDepth/2-.0015),mats.beam);
    }else{
     box('Alma da viga',span,bh,.003,center,y-bh/2,z,mats.beam);
     box('Aba superior da viga',span,light?.0015:.003,light?.008:.04,center,y-.0015,z-sign*(light?.003:.018),mats.beam);
     box('Retorno inferior da viga',span,light?.0015:.003,light?.008:.035,center,y-bh+.0015,z-sign*(light?.003:.015),mats.beam);
    }
    if(!light){box('Nervura longitudinal',span,.009,.006,center,y-bh*.62,z+sign*.003,mats.beam);
     for(const end of [b.left+model.upright/2,b.right-model.upright/2]){
      box('Chapa de encaixe da viga',.038,bh*1.45,.006,end,y-bh*.55,z+sign*.004,mats.connector);
      for(const offset of [.18,.65,1.08]){
       bolt(end,y-bh*offset,z+sign*.009);
       box('Patilha de encaixe',.008,.018,.012,end,y-bh*offset,z-sign*.006,mats.connector);
      }
      box('Retorno lateral do encaixe',.003,bh*1.45,.025,end+(end<center?-.018:.018),y-bh*.55,z-sign*.006,mats.connector);
      box('Freio de segurança',.009,.012,.014,end+.012,y-.006,z+sign*.014,mats.bolt);
     }
    }
   }
   drawPallets(y);
   if(!rack){
    const wood=!light&&model.floorType==='Aglomerado';const shelfMat=wood?mats.wood:mats.metal;
    const overhang=model.type==='bancadas'&&y===Math.max(...b.levels)?.035:0;
    const panels=light?1:Math.max(1,Math.ceil(span/1.05));const panelWidth=(span+overhang*2)/panels;
    const deckDepth=model.type==='bancadas'?model.depth+.025+overhang*2:model.type==='picking'?model.depth-.05:model.depth-.008;
    const supportWidth=model.type==='picking'?.018:.025;
    const supportHeight=model.type==='picking'?.03:.04;
    const supports=!light?shelfReinforcementPositions(b,model.upright):null;
    const supportCenters=supports?[...supports.lateral,...supports.central].sort((a,b)=>a-b):[];
    const panelRanges=model.type==='picking'
     ?supportCenters.slice(0,-1).map((left,index)=>({left:left+supportWidth/2+.001,right:supportCenters[index+1]-supportWidth/2-.001}))
     :Array.from({length:panels},(_,panel)=>({left:b.left+model.upright/2-overhang+panel*panelWidth+.001,right:b.left+model.upright/2-overhang+(panel+1)*panelWidth-.001}));
    for(const range of panelRanges){
     const panelX=(range.left+range.right)/2;const actualPanelWidth=range.right-range.left;
     // Picking metal decks include the solid underside of their folded profile.
     const deckThickness=wood?.018:model.type==='picking'?.006:.0015;
     box(wood?'Painel de aglomerado':'Tampo metálico',actualPanelWidth,deckThickness,deckDepth,panelX,y+(model.type==='picking'?-deckThickness/2:deckThickness/2),0,shelfMat);
     if(!wood&&!light&&model.type!=='picking')for(const side of [-1,1])box('Aba lateral do tabuleiro metálico',.0015,.018,deckDepth,panelX+side*(actualPanelWidth/2-.001),y-.009,0,shelfMat);
    }
    if(!light){
     const supportY=y-supportHeight/2;
     for(const x of supports.lateral)box('Reforço lateral do tampo',supportWidth,supportHeight,model.depth-.04,x,supportY,0,mats.zinc);
     for(const x of supports.central)box('Reforço central do tampo',supportWidth,supportHeight,model.depth-.04,x,supportY,0,mats.zinc);
    }
    if(light)for(let rib=1;rib<=model.shelfRibCount;rib++){
     const z=-model.depth/2+model.depth*rib/(model.shelfRibCount+1);
     // One continuous pressed hat section with rounded shoulders and folded attachment lips.
     const ribGeometry=geometry(`formed-shelf-rib:${span}`,()=>{
      const shape=new THREE.Shape();
      shape.moveTo(-.0445,0);shape.lineTo(-.0395,0);
      shape.quadraticCurveTo(-.03675,0,-.03675,-.00275);
      shape.lineTo(-.03675,-.00525);shape.quadraticCurveTo(-.03675,-.008,-.034,-.008);
      shape.lineTo(.034,-.008);shape.quadraticCurveTo(.03675,-.008,.03675,-.00525);
      shape.lineTo(.03675,-.00275);shape.quadraticCurveTo(.03675,0,.0395,0);
      shape.lineTo(.0445,0);shape.lineTo(.0445,-.0015);shape.lineTo(.0395,-.0015);
      shape.quadraticCurveTo(.03825,-.0015,.03825,-.00275);
      shape.lineTo(.03825,-.00525);shape.quadraticCurveTo(.03825,-.0095,.034,-.0095);
      shape.lineTo(-.034,-.0095);shape.quadraticCurveTo(-.03825,-.0095,-.03825,-.00525);
      shape.lineTo(-.03825,-.00275);shape.quadraticCurveTo(-.03825,-.0015,-.0395,-.0015);
      shape.lineTo(-.0445,-.0015);shape.closePath();
      return new THREE.ExtrudeGeometry(shape,{depth:span-.012,bevelEnabled:false,curveSegments:6});
     });
     put('Reforço longitudinal integrado',ribGeometry,mats.shelfRib,b.left+model.upright/2+.006,y,z,[0,Math.PI/2,0]);

    }
    if(light){
     const rimProfile=geometry(`curved-shelf-rim:${span}`,()=>{
      const shape=new THREE.Shape();shape.moveTo(0,.0015);
      shape.quadraticCurveTo(-.004,.0015,-.004,-.0025);
      shape.lineTo(-.004,-.021);shape.quadraticCurveTo(-.004,-.024,-.001,-.024);
      shape.lineTo(.004,-.024);shape.lineTo(.004,-.0225);shape.lineTo(-.001,-.0225);
      shape.quadraticCurveTo(-.0025,-.0225,-.0025,-.021);
      shape.lineTo(-.0025,-.0025);shape.quadraticCurveTo(-.0025,0,0,0);shape.closePath();
      return new THREE.ExtrudeGeometry(shape,{depth:span-.004,bevelEnabled:false,curveSegments:6});
     });
     for(const side of [-1,1])put('Curva contínua do rebordo do tampo',rimProfile,mats.metal,side<0?b.right-model.upright/2-.002:b.left+model.upright/2+.002,y,side*(deckDepth/2-.004),[0,side*Math.PI/2,0]);
     // Small folded returns and perforated corner clips visible in the underside reference.
     const cornerClip=geometry('light-shelf-corner-clip',()=>{
      const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(.016,0);shape.quadraticCurveTo(.018,0,.018,.002);shape.lineTo(.018,.022);shape.quadraticCurveTo(.018,.024,.016,.024);shape.lineTo(.01,.024);shape.lineTo(.01,.015);shape.quadraticCurveTo(.008,.012,.006,.015);shape.lineTo(.006,.024);shape.lineTo(.002,.024);shape.quadraticCurveTo(0,.024,0,.022);shape.closePath();
      const hole=new THREE.Path();hole.absarc(.009,.006,.0025,0,Math.PI*2,true);shape.holes.push(hole);
      return new THREE.ExtrudeGeometry(shape,{depth:.0015,bevelEnabled:false});
     });
     for(const end of [-1,1])for(const side of [-1,1]){
      const clipX=end<0?b.left+model.upright/2+.002:b.right-model.upright/2-.02;
      put('Encaixe perfurado do canto do tampo',cornerClip,mats.metal,clipX,y-.024,side*(deckDepth/2-.01));
      box('Retorno inferior do rebordo',.018,.0015,.009,clipX+.009,y-.024,side*(deckDepth/2-.006),mats.metal);
     }
     // Solid underside fills the folded shelf rim without changing its outer height.
     for(const side of [-1,1]){
      box('Dobra inferior sólida da prateleira',span,.025,.008,center,y-.012,side*(deckDepth/2-.004),mats.metal);
      box('Dobra lateral sólida da prateleira',.008,.025,deckDepth,b.left+model.upright/2+(side===1?span-.004:.004),y-.012,0,mats.metal);
     }
     for(const z of [-model.depth/2,model.depth/2])box('Borda dobrada da prateleira',span,.025,.002,center,y-.012,z,mats.metal);for(const x of [b.left+model.upright/2,b.right-model.upright/2])box('Borda lateral da prateleira',.002,.025,model.depth,x,y-.012,0,mats.metal);}
   }
  });
 });
 for(const {name,geo,mat,matrices} of batches.values()){const mesh=new THREE.InstancedMesh(geo,mat,matrices.length);mesh.name=name;matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 return {group,materials:mats,dispose:()=>resources.forEach(r=>r.dispose())};
}
