// Beam top heights in metres, anchored at the top of the frame. The bottom
// clearance absorbs the remainder so the upper intervals never get compressed.
export function rackBeamLevels(height,slots){
 if(slots===1)return [height/2];
 const top=height-.125;
 const nominalStep=height*.88/(slots-1);
 const maxStep=(top-.1)/(slots-1);
 const step=Math.min(Math.round(nominalStep/.05)*.05,Math.floor((maxStep+1e-9)/.05)*.05);
 return Array.from({length:slots},(_,i)=>top-(slots-1-i)*step);
}
