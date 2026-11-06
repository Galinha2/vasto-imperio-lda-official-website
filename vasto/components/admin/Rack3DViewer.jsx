'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createRackGeometry} from '@/lib/admin/rack-3d-geometry.mjs';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {rackModel} from '@/lib/admin/rack-3d-model.mjs';
import styles from './Rack3DViewer.module.css';
export default function Rack3DViewer(props){
 const english=Boolean(props.english);
 const host=useRef(null),actions=useRef({});const [error,setError]=useState('');
 const key=JSON.stringify(props);
 useEffect(()=>{
  const node=host.current;const model=rackModel(JSON.parse(key));if(!node||!model){setError((english?'Choose a valid configuration to preview the model.':'Escolha uma configuração válida para ver o modelo.'));return;}
  setError('');let renderer,controls,observer;const disposables=[];let contextLost;let rack;
  function surfaceTexture(kind){
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');if(!ctx)return null;
   const data=ctx.createImageData(256,256);let seed=71;for(let i=0;i<data.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296-.5);const value=Math.round(kind==='wood'?228+noise*30:237+noise*15);data.data[i]=value;data.data[i+1]=kind==='wood'?value-7:value;data.data[i+2]=kind==='wood'?value-18:value;data.data[i+3]=255;}ctx.putImageData(data,0,0);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind==='wood'?3:2,2);texture.anisotropy=4;disposables.push(texture);return texture;
  }
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
   const groundGeo=new THREE.PlaneGeometry(200,200);const groundMat=new THREE.ShadowMaterial({opacity:.1});const ground=new THREE.Mesh(groundGeo,groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.009;ground.receiveShadow=true;scene.add(ground);disposables.push(groundGeo,groundMat);
   const gridSize=Math.max(model.width,model.depth,4)*1.8;const grid=new THREE.GridHelper(gridSize,24,0xbac8d7,0xe0e6ee);grid.position.y=-.02;scene.add(grid);disposables.push(grid.geometry,grid.material);
   const render=()=>renderer.render(scene,camera);const target=new THREE.Vector3(0,model.height/2,0);
   function fit(view='perspective'){
    const sphereRadius=Math.sqrt(model.width**2+model.height**2+model.depth**2)/2;
    const fov=THREE.MathUtils.degToRad(camera.fov);const limitingFov=Math.min(fov,2*Math.atan(Math.tan(fov/2)*camera.aspect));const distance=sphereRadius/Math.sin(limitingFov/2)*1.12;
    const direction=view==='front'?new THREE.Vector3(0,0,1):view==='side'?new THREE.Vector3(1,0,0):view==='top'?new THREE.Vector3(0,1,.001):new THREE.Vector3(.9,.38,1.5).normalize();
    controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance);controls.update();render();
   }
   const resize=()=>{const width=node.clientWidth,height=node.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};resize();fit();observer=new ResizeObserver(resize);observer.observe(node);controls.addEventListener('change',render);
   actions.current={view:fit,zoom:factor=>{camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();render();}};
   contextLost=event=>{event.preventDefault();setError((english?'The 3D preview was interrupted. Switch to 2D and reopen 3D.':'A vista 3D foi interrompida. Feche e volte a abrir o 3D.'));};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  }catch{setError((english?'This device could not open 3D. The 2D drawing remains available.':'Este dispositivo não conseguiu abrir o 3D. O desenho 2D continua disponível.'));}
  return()=>{actions.current={};observer?.disconnect();controls?.dispose();rack?.dispose();disposables.forEach(item=>item.dispose?.());if(renderer){renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.dispose();renderer.domElement.remove();}};
 },[key]);
 return <div className={styles.root}>
  <div className={styles.toolbar} aria-label="Controlos da vista 3D">{[['perspective',english?'Reset view':'Repor vista'],['front',english?'Front':'Frente'],['side',english?'Side':'Lado'],['top',english?'Top':'Topo']].map(([view,label])=><button type="button" key={view} onClick={()=>actions.current.view?.(view)}>{label}</button>)}<button type="button" aria-label="Aproximar modelo" onClick={()=>actions.current.zoom?.(.8)}>+</button><button type="button" aria-label="Afastar modelo" onClick={()=>actions.current.zoom?.(1.25)}>−</button></div>
  {error&&<p className={styles.error} role="alert">{error}</p>}<div ref={host} className={styles.canvas}/>
  <p className={styles.help}>{english?'Drag to rotate · Scroll or pinch to zoom · Right-click or use two fingers to pan.':'Arraste para rodar · Roda do rato ou pinça para zoom · Botão direito ou dois dedos para deslocar.'}</p>
  <p className={styles.note}>{english?'One row of your current configuration. Finishes and details are inspired by product photographs. Illustrative model; refer to the technical drawing for dimensions. Removed shelves match the 2D drawing.':'Vista de uma fila da configuração atual. Acabamentos e pormenores inspirados nas fotografias dos produtos. Modelo ilustrativo, sem substituir o desenho técnico. Os níveis removidos acompanham o desenho 2D.'}</p>
 </div>;
}
