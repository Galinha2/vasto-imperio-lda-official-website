'use client';
import {useEffect,useId,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import styles from './Rack3DViewer.module.css';
import SimulatorSolutions from '@/components/simulador/SimulatorSolutions';
const Viewer=dynamic(()=>import('./Rack3DViewer'),{ssr:false,loading:()=> <p className="p-8 text-sm text-[#86868b]">A preparar o modelo 3D…</p>});
export default function AdminRack3D({enabled=true,unavailable=false,english=false,solutions,selectedSolutionId,onSelectSolution,children,...props}){
 const [selectedMode,setMode]=useState('2d');const mode=unavailable?'2d':selectedMode;const root=useRef(null);const id=useId();
 useEffect(()=>{if(!enabled||!root.current)return;const node=root.current;const resize=()=>node.style.setProperty('--preview-width',`${node.clientWidth}px`);resize();const observer=new ResizeObserver(resize);observer.observe(node);return()=>observer.disconnect();},[enabled]);
 if(!enabled)return children;
 return <section ref={root} className={styles.preview} aria-label={english?"Configuration preview":"Visualização da configuração"}>
  <header className={styles.previewHeader}><div><h2>{english?"Configuration drawing":"Desenho da configuração"}</h2><p>{mode==='2d'?(english?'Dimensions and shelf editing':'Medidas e edição dos níveis'):(english?'Rotate, zoom and inspect':'Rodar, aproximar e inspecionar')}</p></div><div role="group" aria-label={english?"Preview mode":"Tipo de visualização"} className={styles.modeSwitch}>{['2d','3d'].map(value=><button type="button" key={value} disabled={value==='3d'&&unavailable} aria-pressed={mode===value} aria-controls={`${id}-${value}`} onClick={()=>setMode(value)}>{value.toUpperCase()}</button>)}</div></header>
  {/* Keep the original SVG measurable for PDF/image export even while inspecting 3D. */}
  <div id={`${id}-2d`} aria-hidden={mode!=='2d'} inert={mode!=='2d'} className={mode==='2d'?undefined:styles.offscreenDrawing}>{children}</div>
  {mode==='3d'&&<div id={`${id}-3d`} className={styles.viewerPanel}><Viewer {...props} english={english}/>{solutions?.length>0&&<div className="p-4 sm:p-6"><SimulatorSolutions solutions={solutions} selectedId={selectedSolutionId} onSelect={onSelectSolution}/></div>}</div>}
 </section>;
}
