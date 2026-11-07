'use client';
import {useEffect,useState} from 'react';
import {formatLoadHeight,rackPalletLabel} from '@/lib/rack-use-requirements.mjs';
function LoadHeightInput({value,onChange,english}){
 const [draft,setDraft]=useState(()=>value?formatLoadHeight(value,english):'');
 useEffect(()=>{const parsed=Math.round(Number(draft.replace(',','.'))*1000);if((value===''&&draft!=='')||(value!==''&&parsed!==Number(value)))setDraft(value?formatLoadHeight(value,english):'');},[value,english]);
 return <label className="text-xs font-medium text-[#424245]">{english?'Pallet + load height (m)':'Altura da palete + carga (m)'}<input type="text" inputMode="decimal" maxLength={6} value={draft} onChange={e=>{const next=e.target.value;if(!/^\d{0,2}([.,]\d{0,3})?$/.test(next))return;setDraft(next);const number=Number(next.replace(',','.'));onChange(next&&Number.isFinite(number)?String(Math.round(number*1000)):'');}} onBlur={()=>setDraft(value?formatLoadHeight(value,english):'')} className="mt-2 block w-full border border-[#d2d2d7] bg-white px-4 py-3 text-base" placeholder={english?'e.g. 1.50':'Ex.: 1,50'}/></label>;
}

export default function RackUseRequirements({value,onChange,english=false}){
 const update=(key,next)=>onChange({...value,[key]:next});
 return <details className="mt-6 rounded-[24px] border border-[#dce7f0] bg-[#f4f8fc] p-5">
  <summary className="cursor-pointer text-sm font-semibold text-[#0879c0]">{english?'What will you store? (optional)':'O que vai armazenar? (opcional)'}</summary>
  <p className="mt-3 text-xs leading-6 text-[#626268]">{english?'These requirements accompany your request for technical review. They do not change the estimate or certify capacity.':'Estes dados acompanham o pedido para análise técnica. Não alteram a estimativa nem validam a capacidade.'}</p>
  <div className="mt-4 grid gap-4 sm:grid-cols-2">
   <label className="text-xs font-medium text-[#424245]">{english?'Pallet type':'Tipo de palete'}<select className="mt-2 block w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-base" value={value.pallet} onChange={e=>update('pallet',e.target.value)}><option value="">{english?'Not specified':'Não indicado'}</option>{['EUR 1200 × 800 mm','1200 × 1000 mm','Outra / a confirmar'].map(p=><option key={p} value={p}>{rackPalletLabel(p,english)}</option>)}</select></label>
   <LoadHeightInput value={value.loadHeight} onChange={next=>update('loadHeight',next)} english={english}/>
  </div>
  <label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-6 text-[#424245]"><input type="checkbox" checked={value.protection} onChange={e=>update('protection',e.target.checked)} className="mt-1.5"/>{english?'Request pillar/frame protection options, quoted separately.':'Quero opções de proteção de pilares/bastidores, com preço à parte.'}</label>
 </details>;
}
