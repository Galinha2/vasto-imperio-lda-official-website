// Shared physical placement for light-duty 2D, 3D and AR. Units: metres.
export function lightBracePositions(height,count){
 return Array.from({length:count},(_,i)=>height*(.8-.6*i/Math.max(1,count-1)));
}
export function lightShelfPositions(height,slots,braceCounts=[]){
 const braces=[...new Set(braceCounts.flatMap(count=>lightBracePositions(height,count)))];
 const low=.065,high=height-.0015;
 const candidates=[low];
 for(let y=.075;y<high;y+=.025)if(y>low)candidates.push(Number(y.toFixed(6)));
 candidates.push(high);
 const available=candidates.filter(y=>braces.every(brace=>y< brace-.085 || y>brace+.11));
 // Ordered nearest-to-uniform layout, with at least 50 mm between shelf tops.
 let states=available.map((y,index)=>({cost:(y-(slots===1?high:low))**2,path:[index]}));
 for(let level=1;level<slots;level++){
  const target=low+(high-low)*level/(slots-1);
  states=available.map((y,index)=>{
   let best=null;
   for(let prev=0;prev<index;prev++)if(y-available[prev]>=.049999&&states[prev]&&(!best||states[prev].cost<best.cost))best=states[prev];
   return best?{cost:best.cost+(y-target)**2,path:[...best.path,index]}:null;
  });
 }
 const best=states.filter(Boolean).sort((a,b)=>a.cost-b.cost)[0];
 if(!best)throw new Error('LIGHT_SHELVES_DO_NOT_FIT');
 return best.path.map(index=>available[index]);
}
