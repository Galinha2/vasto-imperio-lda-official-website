import test from 'node:test';import assert from 'node:assert/strict';
import {rackModel} from '../lib/admin/rack-3d-model.mjs';
import {createRackGeometry} from '../lib/admin/rack-3d-geometry.mjs';
const base={modules:[1500],height:2500,depth:800,slots:3};
test('painted and galvanized Picking have perforated profiles, connectors and different finishes',()=>{
 for(const galvanized of [false,true]){const r=createRackGeometry(rackModel({...base,galvanized}));try{assert.equal(r.materials.upright.color.getHex(),galvanized?0xbcc5cc:0x0676bb);assert.ok(r.group.children.some(p=>p.name==='Montante com perfuração'&&p.geometry.parameters.shapes.holes.length>0));assert.ok(r.group.children.some(p=>p.name==='Chapa de encaixe da viga'));assert.ok(r.group.children.some(p=>p.name==='Parafuso sextavado'));assert.ok(r.group.children.some(p=>p.name==='Painel de aglomerado'));}finally{r.dispose();}}
});
test('racks keep orange beams without decks; light shelving has grey metal shelves and feet',()=>{
 const r=createRackGeometry(rackModel({...base,type:'racks'}));try{assert.equal(r.materials.beam.color.getHex(),0xe87820);assert.ok(!r.group.children.some(p=>p.name==='Painel de aglomerado'||p.name==='Tampo metálico'));}finally{r.dispose();}
 const l=createRackGeometry(rackModel({...base,type:'ligeiras'}));try{assert.ok(l.group.children.some(p=>p.name==='Tampo metálico'));assert.ok(l.group.children.some(p=>p.name==='Pé plástico'));assert.ok(!l.group.children.some(p=>p.name==='Diagonal galvanizada'));}finally{l.dispose();}
});
test('2750 Picking has three central supports per active level; missing levels do not generate decks',()=>{
 const r=createRackGeometry(rackModel({...base,modules:[2750],levelsByModule:[[1]]}));try{assert.equal(r.group.children.find(p=>p.name==='Reforço central do tampo').count,3);}finally{r.dispose();}
 const empty=createRackGeometry(rackModel({...base,levelsByModule:[[]]}));try{assert.ok(!empty.group.children.some(p=>p.name==='Painel de aglomerado'));}finally{empty.dispose();}
});

test('light-duty braced bays use horizontal rear ties instead of X diagonals',()=>{
 const model=rackModel({...base,type:'ligeiras',height:3000,modules:[1000,750,1000],bracedIndexes:[0,2],braceCounts:[3,0,3]});
 assert.deepEqual(model.bays.map(b=>b.horizontalBraces.length),[3,0,3]);
 assert.ok(Math.abs(model.bays[0].horizontalBraces[0]-2.4)<1e-9);assert.ok(Math.abs(model.bays[0].horizontalBraces[2]-.6)<1e-9);
 const r=createRackGeometry(model);try{assert.equal(r.group.children.filter(p=>p.name==='Travamento horizontal traseiro').reduce((n,p)=>n+p.count,0),6);assert.ok(!r.group.children.some(p=>p.name==='Diagonal galvanizada'));}finally{r.dispose();}
});

test('workbench decks have two end supports and equally spaced central supports',()=>{
 for(const [length,count] of [[1500,1],[2250,2],[2750,3]]){
  const model=rackModel({...base,type:'bancadas',height:1000,modules:[length],slots:1});
  const r=createRackGeometry(model);try{
   const laterals=r.group.children.find(p=>p.name==='Reforço lateral do tampo');const centers=r.group.children.find(p=>p.name==='Reforço central do tampo');assert.equal(laterals.count,2);assert.equal(centers.count,count);
   const xAt=(mesh,index)=>mesh.instanceMatrix.array[index*16+12];const xs=[xAt(laterals,0),...Array.from({length:count},(_,i)=>xAt(centers,i)),xAt(laterals,1)];const gap=(xs.at(-1)-xs[0])/(count+1);for(let i=1;i<xs.length;i++)assert.ok(Math.abs(xs[i]-xs[i-1]-gap)<1e-6);
  }finally{r.dispose();}
 }
});

test('light shelves at 500/600 mm have one/two integrated longitudinal ribs per active shelf',()=>{
 for(const [depth,count] of [[300,0],[400,0],[500,1],[600,2]]){
  const r=createRackGeometry(rackModel({...base,type:'ligeiras',depth,levelsByModule:[[0,2]]}));
  try{
   const rib=r.group.children.find(p=>p.name==='Reforço longitudinal integrado');
   if(!count){assert.equal(rib,undefined);continue;}
   assert.equal(rib.count,count*2);assert.equal(rib.material,r.materials.metal);assert.ok(rib.geometry.parameters.width>1);assert.equal(rib.geometry.parameters.depth,.04);const flange=r.group.children.find(p=>p.name==='Aba do reforço integrado');assert.equal(flange.geometry.parameters.height,.012);
   const xs=Array.from({length:rib.count},(_,i)=>rib.instanceMatrix.array[i*16+12]);assert.ok(xs.every(x=>Math.abs(x-xs[0])<1e-6));
   const zs=Array.from({length:count},(_,i)=>rib.instanceMatrix.array[i*16+14]);
   if(count===1)assert.ok(Math.abs(zs[0])<1e-6);else{assert.ok(zs[0]<0&&zs[1]>0);assert.ok(Math.abs(zs[0]+zs[1])<1e-6);}
  }finally{r.dispose();}
 }
});

test('light-duty and Picking decks stay within the frames in both directions',()=>{
 for(const type of ['ligeiras','picking'])for(const floorType of ['Aglomerado','Metálica']){
  const model=rackModel({...base,type,floorType,modules:[1000,1500]});const r=createRackGeometry(model);
  try{for(const mesh of r.group.children.filter(p=>['Painel de aglomerado','Tampo metálico'].includes(p.name))){const {width,depth}=mesh.geometry.parameters;for(let i=0;i<mesh.count;i++){const x=mesh.instanceMatrix.array[i*16+12],z=mesh.instanceMatrix.array[i*16+14];assert.ok(x-width/2>=-1e-6);assert.ok(x+width/2<=model.width+1e-6);assert.ok(Math.abs(z)+depth/2<=model.depth/2+1e-6);}}}finally{r.dispose();}
 }
});

test('each light-duty frame has one horizontal mid-height tie across its depth',()=>{
 const model=rackModel({...base,type:'ligeiras',modules:[1000,750],height:2000,depth:500});const r=createRackGeometry(model);
 try{const tie=r.group.children.find(p=>p.name==='Barra horizontal central do bastidor');assert.equal(tie.count,3);assert.equal(tie.material,r.materials.upright);assert.ok(tie.geometry.parameters.depth>.49);assert.ok(tie.geometry.parameters.width<.04);for(let i=0;i<tie.count;i++){assert.ok(Math.abs(tie.instanceMatrix.array[i*16+13]-1)<1e-6);assert.equal(tie.instanceMatrix.array[i*16+14],0);}}finally{r.dispose();}
 const picking=createRackGeometry(rackModel({...base,type:'picking'}));try{assert.ok(!picking.group.children.some(p=>p.name==='Barra horizontal central do bastidor'));}finally{picking.dispose();}
});
