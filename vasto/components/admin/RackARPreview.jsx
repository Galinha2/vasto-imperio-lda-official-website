'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './Rack3DViewer.module.css';

let modelViewerPromise;
function loadModelViewer(){
 if(customElements.get('model-viewer'))return Promise.resolve();
 if(!modelViewerPromise)modelViewerPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.type='module';script.src='/vendor/model-viewer/model-viewer-4.4.0.min.js';
  script.onload=()=>customElements.whenDefined('model-viewer').then(resolve);
  script.onerror=()=>{script.remove();modelViewerPromise=undefined;reject(new Error('AR_LIBRARY_FAILED'));};document.head.appendChild(script);
 });
 return modelViewerPromise;
}
export default function RackARPreview({model,english=false,onClose}){
 const dialog=useRef(null),viewer=useRef(null);const [src,setSrc]=useState(''),[ready,setReady]=useState(false),[supported,setSupported]=useState(false),[launching,setLaunching]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const node=dialog.current;node.showModal();return()=>node.close();},[]);
 useEffect(()=>{
  setReady(false);setSupported(false);setError('');
  let cancelled=false,url;const key=JSON.stringify(model);
  async function prepare(){
   let asset;
   try{
    await loadModelViewer();
    const [{GLTFExporter},{createARScene}]=await Promise.all([import('three/addons/exporters/GLTFExporter.js'),import('@/lib/admin/rack-ar-export.mjs')]);
    if(cancelled)return;
    asset=createARScene(JSON.parse(key));
    const buffer=await new GLTFExporter().parseAsync(asset.scene,{binary:true,onlyVisible:true});
    if(cancelled)return;
    url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));setSrc(url);
   }catch(err){if(!cancelled)setError(err.message==='AR_MODEL_TOO_LARGE'?(english?'This configuration is too large for mobile AR. Try fewer modules.':'Esta configuração é demasiado grande para a realidade aumentada no telemóvel. Experimente com menos módulos.'):(english?'Could not prepare the model. Please try again.':'Não foi possível preparar o modelo. Tente novamente.'));}
   finally{asset?.dispose();}
  }
  prepare();return()=>{cancelled=true;if(url)URL.revokeObjectURL(url);};
 },[model,english]);
 useEffect(()=>{
  const node=viewer.current;if(!src||!node)return;
  let cancelled=false,poll;
  const sync=()=>{
   if(cancelled)return;
   setReady(Boolean(node.loaded));setSupported(Boolean(node.canActivateAR));
   if(node.loaded&&node.canActivateAR)clearInterval(poll);
  };
  const loaded=()=>{sync();Promise.resolve(node.updateComplete).then(()=>{if(!cancelled)requestAnimationFrame(sync);});};
  const failed=()=>{if(!cancelled){setLaunching(false);setError(english?'Unable to open this model on your device.':'Não foi possível abrir este modelo neste dispositivo.');}};
  const status=event=>{sync();if(event.detail.status==='failed')failed();};
  node.addEventListener('load',loaded);node.addEventListener('error',failed);node.addEventListener('ar-status',status);
  // AR mode selection may finish after the model's load event (e.g. WebXR detection).
  poll=setInterval(sync,250);const stop=setTimeout(()=>clearInterval(poll),10000);
  loaded();
  return()=>{cancelled=true;clearInterval(poll);clearTimeout(stop);node.removeEventListener('load',loaded);node.removeEventListener('error',failed);node.removeEventListener('ar-status',status);};
 },[src,english]);
 return createPortal(<dialog ref={dialog} className={styles.arDialog} onCancel={onClose} aria-labelledby="rack-ar-title">
  <header><h2 id="rack-ar-title">{english?'View in your space':'Ver no meu espaço'}</h2><button type="button" onClick={onClose} aria-label={english?'Close':'Fechar'}>×</button></header>
  <p>{english?'Place one row of your current configuration on the floor, at its actual size.':'Coloque uma fila da configuração atual no chão do seu espaço, à escala real.'}</p>
  {src&&<model-viewer ref={viewer} src={src} ar={true} ar-modes="quick-look webxr" ar-scale="fixed" ar-placement="floor" camera-controls="" shadow-intensity="1" alt={english?'Your shelving configuration':'A sua configuração de estantes'}><span slot="ar-button"/></model-viewer>}
  {!ready&&!error&&<p role="status">{english?'Preparing your model…':'A preparar o seu modelo…'}</p>}
  {error&&<p role="alert">{error}</p>}
  {ready&&<><button className={styles.arLaunch} type="button" disabled={!supported||launching} aria-busy={launching} onClick={()=>{
    const node=viewer.current;
    if(!node?.canActivateAR){setSupported(false);return;}
    setError('');setLaunching(true);
    // Invoke directly in the tap handler so iOS retains the user activation.
    try{Promise.resolve(node.activateAR()).catch(()=>setError(english?'Could not open augmented reality. Please try again in Safari on your iPhone.':'Não foi possível abrir a realidade aumentada. Tente novamente no Safari do iPhone.')).finally(()=>setLaunching(false));}
    catch{setLaunching(false);setError(english?'Could not open augmented reality. Please try again.':'Não foi possível abrir a realidade aumentada. Tente novamente.');}
   }}>{launching?(english?'Opening AR…':'A abrir realidade aumentada…'):(english?'View in my space':'Ver no meu espaço')}</button><p>{supported?(english?'On iPhone, Apple’s viewer opens. Select AR and point the camera at the floor. On compatible Android devices, allow camera access when prompted.':'No iPhone, abre o visualizador da Apple: selecione RA e aponte a câmara para o chão. Num Android compatível, permita o acesso à câmara quando solicitado.'):(english?'AR is not available in this browser. Use Safari on an iPhone or Chrome on an AR-compatible Android device. Android requires HTTPS.':'A realidade aumentada não está disponível neste navegador. Use o Safari do iPhone ou o Chrome de um Android compatível. No Android é necessário HTTPS.')}</p></>}
 </dialog>,document.body);
}
