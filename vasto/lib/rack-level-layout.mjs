// Beam top heights in metres, anchored at the top of the frame. The bottom
// clearance absorbs the remainder so the upper intervals never get compressed.
export function rackBeamLevels(height,slots,loadHeight=0){
 const top=height-.125;
 // Reserve a floor position only when the loaded pallet and beam clearance fit.
 if(loadHeight>0){
  const step=Math.floor((top/slots+1e-9)/.05)*.05;
  const bottom=top-(slots-1)*step;
  if(Math.min(bottom,step)>=loadHeight+.2-1e-9)return Array.from({length:slots},(_,i)=>bottom+i*step);
 }
 if(slots===1)return [height/2];
 const nominalStep=height*.88/(slots-1);
 const maxStep=(top-.1)/(slots-1);
 const step=Math.min(Math.round(nominalStep/.05)*.05,Math.floor((maxStep+1e-9)/.05)*.05);
 return Array.from({length:slots},(_,i)=>top-(slots-1-i)*step);
}

export function rackFloorFits(levels,loadHeight){
 return loadHeight>0&&levels.length>0&&Math.min(...levels)>=loadHeight+.2-1e-9;
}
