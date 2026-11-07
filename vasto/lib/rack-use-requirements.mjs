const choices=['','EUR 1200 × 800 mm','1200 × 1000 mm','Outra / a confirmar'];
export function normalizeRackUse(value={}){
 const numeric=key=>String(value?.[key]??'').replace(/[^0-9]/g,'').slice(0,5);
 return {pallet:choices.includes(value?.pallet)?value.pallet:'',weight:numeric('weight'),loadHeight:numeric('loadHeight'),palletsPerLevel:numeric('palletsPerLevel'),protection:value?.protection===true};
}
export function rackUseDetails(value){
 const v=normalizeRackUse(value);const parts=[];
 if(v.pallet)parts.push(`Tipo de palete: ${rackPalletLabel(v.pallet)}`);
 if(v.weight)parts.push(`Peso por palete carregada: ${v.weight} kg`);
 if(v.loadHeight)parts.push(`Altura da palete com carga: ${formatLoadHeight(v.loadHeight)} m`);
 if(v.palletsPerLevel)parts.push(`Paletes pretendidas por nível: ${v.palletsPerLevel}`);
 if(v.protection)parts.push('Solicita proposta para proteções de pilares/bastidores (não incluídas na estimativa)');
 return parts.length?` · Utilização indicada pelo cliente, sujeita a validação técnica: ${parts.join(' · ')}`:'';
}

// Pallet dimensions in metres. The narrow entry face is displayed across the bay.
export function rackPalletLayout(value,clearLength){
 const v=normalizeRackUse(value);
 const width=v.pallet==='EUR 1200 × 800 mm'?.8:v.pallet==='1200 × 1000 mm'?1:0;
 if(!width)return null;
 const depth=1.2,palletHeight=.144,gap=.05,endGap=.05;
 const fits=Math.max(0,Math.floor((clearLength-2*endGap+gap+1e-9)/(width+gap)));
 const requested=Number(v.palletsPerLevel)||0;
 const count=requested?Math.min(requested,fits):fits;
 const occupied=count*width+Math.max(0,count-1)*gap;
 const centres=Array.from({length:count},(_,i)=>-occupied/2+width/2+i*(width+gap));
 const specifiedHeight=Number(v.loadHeight)/1000;
 return {width,depth,palletHeight,count,requested,fits,centres,weight:Number(v.weight)||0,loadHeight:specifiedHeight?Math.max(palletHeight,specifiedHeight):palletHeight,heightTooSmall:specifiedHeight>0&&specifiedHeight<palletHeight,overCapacity:false};
}

export function formatLoadHeight(mm,english=false){
 return (Number(mm)/1000).toLocaleString(english?'en-IE':'pt-PT',{minimumFractionDigits:2,maximumFractionDigits:3});
}
export function rackPalletLabel(pallet,english=false){
 if(pallet==='EUR 1200 × 800 mm')return english?'Euro pallet · 1.20 × 0.80 m':'Euro-palete · 1,20 × 0,80 m';
 if(pallet==='1200 × 1000 mm')return english?'1.20 × 1.00 m':'1,20 × 1,00 m';
 return english&&pallet==='Outra / a confirmar'?'Other / to confirm':pallet;
}
