import * as THREE from 'three';

// Viewer-only scenery: no downloaded assets, textures, lights or shadow passes.
export function createRackWarehouse(model) {
 const group=new THREE.Group();group.name='Armazém';
 // Keep the walls beyond the usual orbit, including tall shelving on narrow screens.
 const clearance=Math.max(12,model.height*4,model.depth*3);
 const width=Math.max(28,model.width+clearance*2),depth=Math.max(28,model.depth+clearance*2);
 const height=Math.max(6,model.height+2.5),back=-depth/2;
 const resources=[];
 function material(color){const m=new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0});resources.push(m);return m;}
 const concrete=material(0xd8dee2),wall=material(0xf1f3f5),steel=material(0x31566f);
 const orange=material(0xe87820),slate=material(0x687e8e),glass=material(0xb8d7e7);
 const lamp=new THREE.MeshBasicMaterial({color:0xf4fbff});resources.push(lamp);
 function plane(w,h,mat,position,rotation){
  const geo=new THREE.PlaneGeometry(w,h);resources.push(geo);
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(...position);mesh.rotation.set(...rotation);group.add(mesh);return mesh;
 }
 const floor=plane(Math.max(200,width*3),Math.max(200,depth*3),concrete,[0,-.025,0],[-Math.PI/2,0,0]);floor.receiveShadow=true;
 // Single-sided walls disappear when inspecting from outside the building.
 plane(width,height,wall,[0,height/2,back],[0,0,0]);
 plane(depth,height,wall,[-width/2,height/2,0],[0,Math.PI/2,0]);
 plane(depth,height,wall,[width/2,height/2,0],[0,-Math.PI/2,0]);
 const geometry=new THREE.BoxGeometry(1,1,1);resources.push(geometry);
 const batches=[];
 function boxes(name,mat,items){
  const mesh=new THREE.InstancedMesh(geometry,mat,items.length);mesh.name=name;
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  items.forEach(([x,y,z,w,h,d],i)=>{matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(w,h,d));mesh.setMatrixAt(i,matrix);});
  group.add(mesh);batches.push(mesh);
 }
 const frame=[],protection=[],panels=[],windows=[],lights=[];
 const columns=6;
 for(let i=0;i<columns;i++){
  const x=-width/2+.2+(width-.4)*i/(columns-1);
  frame.push([x,height/2,back+.1,.18,height,.22],[x,height-.12,0,.14,.24,depth]);
  protection.push([x,.38,back+.22,.25,.76,.28]);
  if(i<columns-1){
   const bay=(width-.4)/(columns-1),center=x+bay/2;
   windows.push([center,height*.72,back+.035,bay-.32,.85,.035]);
   frame.push([center,height*.72,back+.07,.055,.85,.05]);
   lights.push([center,height-.28,-depth*.12,Math.min(bay*.7,2),.035,.14]);
  }
 }
 frame.push([0,height*.72-.46,back+.08,width,.07,.08],[0,height*.72+.46,back+.08,width,.07,.08]);
 panels.push([0,.65,back+.04,width,1.3,.06],[-width/2+.025,.65,0,.05,1.3,depth],[width/2-.025,.65,0,.05,1.3,depth]);
 protection.push([0,1.34,back+.085,width,.055,.025]);
 // A roller shutter adds an industrial reference without image textures.
 const doorX=width*.27,doorWidth=Math.min(2.8,width*.23),doorHeight=Math.min(3.6,height*.58);
 panels.push([doorX,doorHeight/2,back+.13,doorWidth,doorHeight,.06]);
 for(let i=1;i<13;i++)frame.push([doorX,doorHeight*i/13,back+.17,doorWidth,.018,.018]);
 protection.push([doorX-doorWidth/2-.06,doorHeight/2,back+.2,.1,doorHeight,.1],[doorX+doorWidth/2+.06,doorHeight/2,back+.2,.1,doorHeight,.1],[doorX,doorHeight+.04,back+.2,doorWidth+.22,.1,.1]);
 // Painted bay markings stay close enough to read at the default camera distance.
 const bayWidth=model.width+1.2,bayDepth=model.depth+1.4;
 protection.push([0,-.018,bayDepth/2,bayWidth,.003,.045],[0,-.018,-bayDepth/2,bayWidth,.003,.045],[-bayWidth/2,-.018,0,.045,.003,bayDepth],[bayWidth/2,-.018,0,.045,.003,bayDepth]);
 boxes('Estrutura metálica azul',steel,frame);boxes('Proteções e marcações laranja',orange,protection);
 boxes('Lambrim e porta de carga',slate,panels);boxes('Janelas altas',glass,windows);boxes('Luminárias',lamp,lights);
 const grid=new THREE.GridHelper(Math.max(width,depth)*2,24,0xc7cdd2,0xd6dbdf);grid.position.y=-.022;group.add(grid);resources.push(grid.geometry,grid.material);
 return {group,dispose(){batches.forEach(mesh=>mesh.dispose());resources.forEach(r=>r.dispose());}};
}
