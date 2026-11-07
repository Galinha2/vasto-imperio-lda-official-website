'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createRackWarehouse} from '@/lib/admin/rack-warehouse.mjs';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createRackGeometry} from '@/lib/admin/rack-3d-geometry.mjs';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {rackModel} from '@/lib/admin/rack-3d-model.mjs';
import styles from './Rack3DViewer.module.css';
import RackLoadSummary from '@/components/simulador/RackLoadSummary';
import dynamic from 'next/dynamic';
const ARPreview=dynamic(()=>import('./RackARPreview'),{ssr:false});
export default function Rack3DViewer(props){
 const english=Boolean(props.english);
 const host=useRef(null),actions=useRef({});const [error,setError]=useState('');
 const [arOpen,setAROpen]=useState(false);
 const [ready,setReady]=useState(false),[retry,setRetry]=useState(0);
 const key=JSON.stringify(props);
 const summary=rackModel(props);
 const meters=value=>`${value.toLocaleString(english?'en-IE':'pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})} m`;
 const title=({picking:english?'Picking shelving':'Estante de picking',racks:english?'Industrial pallet racking':'Rack industrial para paletes',ligeiras:english?'Light-duty shelving':'Estante de carga ligeira',bancadas:english?'Workbench':'Bancada'})[props.type];
 useEffect(()=>{
  setReady(false);setError('');props.onStatusChange?.('loading');
  let cancelled=false,initialFrame,initialTimer,readyFrame;
  const node=host.current;const model=rackModel(JSON.parse(key));if(!node||!model){setError((english?'Choose a valid configuration to preview the model.':'Escolha uma configuração válida para ver o modelo.'));props.onStatusChange?.('error');return;}
  setError('');let renderer,controls,observer;const disposables=[];let contextLost;let rack;
  function surfaceTexture(kind){
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');if(!ctx)return null;
   const data=ctx.createImageData(256,256);let seed=71;for(let i=0;i<data.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296-.5);const value=Math.round(kind==='wood'?228+noise*30:237+noise*15);data.data[i]=value;data.data[i+1]=kind==='wood'?value-7:value;data.data[i+2]=kind==='wood'?value-18:value;data.data[i+3]=255;}ctx.putImageData(data,0,0);
   // Fine irregular chips and zinc flakes; deterministic across model updates.
   for(let i=0;i<2200;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=(seed>>>8)%256;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=(seed>>>8)%256;
    ctx.fillStyle=kind==='wood'?(i%2?'rgba(99,65,28,.18)':'rgba(255,239,205,.28)'):(i%2?'rgba(148,161,170,.12)':'rgba(255,255,255,.22)');
    ctx.save();ctx.translate(x,y);ctx.rotate((seed%628)/100);ctx.fillRect(0,0,kind==='wood'?2+seed%5:2,kind==='wood'?.7:2);ctx.restore();
   }
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind==='wood'?3:2,2);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());disposables.push(texture);return texture;
  }
  function initialize(){
  if(cancelled)return;
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0xf5f7fa,1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   node.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',(english?'Interactive 3D shelving model':'Modelo 3D interativo da estante'));renderer.domElement.tabIndex=0;
   const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(40,1,.01,500);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.15;controls.maxDistance=150;controls.screenSpacePanning=true;controls.maxPolarAngle=Math.PI;
   scene.add(new THREE.HemisphereLight(0xffffff,0xb9c6d5,1.2));
   const pmrem=new THREE.PMREMGenerator(renderer);const environment=new RoomEnvironment();const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.65;disposables.push(env);environment.dispose();pmrem.dispose();
   const light=new THREE.DirectionalLight(0xfff6e9,2);light.position.set(-3,7,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);const extent=Math.max(model.width,model.height,model.depth)*.85;light.shadow.camera.left=-extent;light.shadow.camera.right=extent;light.shadow.camera.top=extent;light.shadow.camera.bottom=-extent;light.shadow.camera.near=.1;light.shadow.camera.far=40;light.shadow.bias=-.0002;light.shadow.normalBias=.015;scene.add(light);disposables.push(light.shadow);
   const fill=new THREE.DirectionalLight(0xddeeff,.7);fill.position.set(4,3,-5);scene.add(fill);
   rack=createRackGeometry(model,{woodTexture:surfaceTexture('wood'),zincTexture:surfaceTexture('zinc')});scene.add(rack.group);
   // Dimension lines rotate with the model; labels face the camera for readability.
   const dimensionMaterial=new THREE.LineBasicMaterial({color:0x52667b});disposables.push(dimensionMaterial);
   function dimension(a,b,label){
    const length=a.distanceTo(b);const tick=Math.min(.06,model.height*.025);
    const cross=Math.abs(b.y-a.y)>.001?new THREE.Vector3(tick,0,0):new THREE.Vector3(0,tick,0);
    const points=[a,b,a.clone().sub(cross),a.clone().add(cross),b.clone().sub(cross),b.clone().add(cross)];
    const geo=new THREE.BufferGeometry().setFromPoints(points);disposables.push(geo);scene.add(new THREE.LineSegments(geo,dimensionMaterial));
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.fillStyle='rgba(245,247,250,.96)';ctx.fillRect(0,0,512,112);ctx.font='600 48px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#34495e';ctx.fillText(label,256,56);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map:texture,depthTest:false});const sprite=new THREE.Sprite(material);
    sprite.position.copy(a).add(b).multiplyScalar(.5);sprite.position.y+=Math.max(.07,model.height*.035);const size=Math.max(.32,Math.min(.7,length*.3));sprite.scale.set(size,size*112/512,1);scene.add(sprite);disposables.push(texture,material);
   }
   const dimOffset=Math.max(.12,model.height*.07);
   const fmt=value=>`${value.toLocaleString(english?'en-IE':'pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})} m`;
   dimension(new THREE.Vector3(-model.width/2,.02,model.depth/2+dimOffset),new THREE.Vector3(model.width/2,.02,model.depth/2+dimOffset),fmt(model.width));
   dimension(new THREE.Vector3(-model.width/2-dimOffset,0,0),new THREE.Vector3(-model.width/2-dimOffset,model.height,0),fmt(model.height));
   dimension(new THREE.Vector3(model.width/2+dimOffset,.02,-model.depth/2),new THREE.Vector3(model.width/2+dimOffset,.02,model.depth/2),fmt(model.depth));
   const warehouse=createRackWarehouse(model);scene.add(warehouse.group);disposables.push(warehouse);
   const previewHeight=Math.max(model.height,...model.bays.flatMap(b=>b.palletLoad?b.levels.map(y=>y+b.palletLoad.loadHeight):[]));
   const render=()=>renderer.render(scene,camera);const target=new THREE.Vector3(0,previewHeight/2,0);
   function fit(view='perspective'){
    // Keep long rows close enough to inspect in every preset view.
    // Single bays keep their approved fit.
    const framedWidth=model.bays.length>1
     ?Math.min(model.width,Math.max(model.height*(model.type==='racks'?1.1:2.2),model.bays[0].length*(model.type==='racks'?1.2:2)))
     :model.width;
    const sphereRadius=Math.sqrt(framedWidth**2+previewHeight**2+model.depth**2)/2;
    const fov=THREE.MathUtils.degToRad(camera.fov);const limitingFov=Math.min(fov,2*Math.atan(Math.tan(fov/2)*camera.aspect));const distance=sphereRadius/Math.sin(limitingFov/2)*1.12;
    const direction=view==='front'?new THREE.Vector3(0,0,1):view==='side'?new THREE.Vector3(1,0,0):view==='top'?new THREE.Vector3(0,1,.001):new THREE.Vector3(.9,.38,1.5).normalize();
    controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance);controls.update();render();
   }
   const resize=()=>{const width=node.clientWidth,height=node.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};resize();fit();observer=new ResizeObserver(resize);observer.observe(node);controls.addEventListener('change',render);
   actions.current={view:fit,zoom:factor=>{camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();render();}};
   contextLost=event=>{event.preventDefault();cancelAnimationFrame(readyFrame);setReady(false);props.onStatusChange?.('error');setError((english?'The 3D preview was interrupted. Try loading it again.':'A vista 3D foi interrompida. Tente carregar novamente.'));};renderer.domElement.addEventListener('webglcontextlost',contextLost);
   readyFrame=requestAnimationFrame(()=>{if(!cancelled){setReady(true);props.onStatusChange?.('ready');}});
  }catch{setReady(false);props.onStatusChange?.('error');setError((english?'This device could not open 3D. The 2D drawing remains available.':'Este dispositivo não conseguiu abrir o 3D. O desenho 2D continua disponível.'));}
  }
  // Paint the loading state before building geometry and compiling WebGL shaders.
  initialFrame=requestAnimationFrame(()=>{initialTimer=setTimeout(initialize,0);});
  return()=>{cancelled=true;cancelAnimationFrame(initialFrame);cancelAnimationFrame(readyFrame);clearTimeout(initialTimer);actions.current={};observer?.disconnect();controls?.dispose();rack?.dispose();disposables.forEach(item=>item.dispose?.());if(renderer){renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
 },[key,retry]);
 return <div className={styles.root}>
  {summary&&<div className={styles.summary}><h3>{title}</h3><p>{english?'Your configuration · 3D preview':'A sua configuração · Pré-visualização 3D'}</p><dl>{[
   [english?'Length per row':'Comprimento por fila',meters(summary.width)],
   [english?'Height':'Altura',meters(summary.height)],
   [english?'Depth':'Profundidade',meters(summary.depth)],
   [english?'Modules per row':'Módulos por fila',summary.bays.length],
   [english?'Rows':'Filas',props.rowCount??1],
   [english?'Levels per module':'Níveis por módulo',summary.bays.map(b=>b.levels.length).join(' / ')],
  ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{props.capacityLabel&&<strong>{props.capacityLabel}</strong>}</div>}

  {arOpen&&summary&&<ARPreview model={summary} english={english} onClose={()=>setAROpen(false)}/>}
  <div className={styles.toolbar} aria-label="Controlos da vista 3D">{[['perspective',english?'Reset view':'Repor vista'],['front',english?'Front':'Frente'],['side',english?'Side':'Lado'],['top',english?'Top':'Topo']].map(([view,label])=><button type="button" key={view} disabled={!ready} onClick={()=>actions.current.view?.(view)}>{label}</button>)}<button type="button" aria-label="Aproximar modelo" disabled={!ready} onClick={()=>actions.current.zoom?.(.8)}>+</button><button type="button" aria-label="Afastar modelo" disabled={!ready} onClick={()=>actions.current.zoom?.(1.25)}>−</button><button type="button" className={styles.arButton} disabled={!summary||!ready} onClick={()=>setAROpen(true)}>{english?"View in your space":"Ver no meu espaço"}</button></div>
  {error&&<div className={styles.error} role="alert"><p>{error}</p><button type="button" className={styles.retryButton} onClick={()=>setRetry(value=>value+1)}>{english?"Try again":"Tentar novamente"}</button></div>}<div ref={host} className={styles.canvas}/>
  {props.type==='racks'&&<RackLoadSummary height={props.height} slots={props.slots} levelsByModule={props.levelsByModule} value={props.useRequirements} modules={props.modules} capacity={props.loadCapacity} english={english}/>}
  <p className={styles.help}>{english?'Drag to rotate · Scroll or pinch to zoom · Right-click or use two fingers to pan.':'Arraste para rodar · Roda do rato ou pinça para zoom · Botão direito ou dois dedos para deslocar.'}</p>
  <p className={styles.note}>{english?'One row of your current configuration. Finishes and details are inspired by product photographs. Illustrative model; refer to the technical drawing for dimensions. Removed shelves match the 2D drawing.':'Vista de uma fila da configuração atual. Acabamentos e pormenores inspirados nas fotografias dos produtos. Modelo ilustrativo, sem substituir o desenho técnico. Os níveis removidos acompanham o desenho 2D.'}</p>
 </div>;
}
