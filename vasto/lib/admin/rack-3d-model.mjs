import {rackBeamLevels,rackFloorFits} from '../rack-level-layout.mjs';
import {normalizeRackUse,rackPalletLayout} from '../rack-use-requirements.mjs';
import {lightShelfPositions,lightBracePositions} from '../light-shelf-layout.mjs';
import {pickingCentralCount} from '../picking-reinforcements.mjs';
import {workbenchLevelPosition} from '../workbench.mjs';
// Dimensions are in millimetres; rendering uses metres. Photographs guide finishes,
// while the selected simulator dimensions determine the overall envelope.
export function rackModel({modules=[],height,depth,slots=4,levelsByModule=[],type='picking',galvanized=false,floorType='Aglomerado',reinforcedBeams=false,finalLength,bracedIndexes=[],braceCounts=[],useRequirements={}}){
 const lengths=modules.map(Number);const h=Number(height)/1000,d=Number(depth)/1000;
 if(!lengths.length||lengths.length>100||lengths.some(v=>!Number.isFinite(v)||v<=0)||![h,d].every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(slots)||slots<1||slots>20)return null;
 const upright=type==='racks'?.1:type==='ligeiras'?.035:.05;
 const sum=lengths.reduce((a,b)=>a+b,0)/1000;
 const width=Number(finalLength)>0?Number(finalLength)/1000:type==='racks'?sum+(lengths.length+1)*upright:type==='ligeiras'?sum:sum+upright;
 const pitchSum=sum+(type==='racks'?lengths.length*upright:0);
 const pitchScale=(width-upright)/pitchSum;
 const beamHeight=type==='racks'?.1:type==='ligeiras'?.028:type==='picking'?(reinforcedBeams?.1:.06):reinforcedBeams?.11:.075;
 const topInset=type==='ligeiras'?.0015:type==='picking'?0:beamHeight*1.25+(type==='racks'?0:.018);
 const lightCounts=type==='ligeiras'?lengths.map((_,index)=>bracedIndexes.includes(index)?(braceCounts[index]??(h>=3&&(index===0||index===lengths.length-1)?3:2)):0):[];
 const rackLevels=type==='racks'?rackBeamLevels(h,slots,rackPalletLayout(useRequirements,1)?.loadHeight||0):[];
 const lightLevels=type==='ligeiras'?lightShelfPositions(h,slots,lightCounts):[];
 let x=upright/2;const bays=lengths.map((mm,index)=>{const length=mm/1000;const left=x;const right=x+(length+(type==='racks'?upright:0))*pitchScale;x=right;
  const levelIds=levelsByModule[index]||Array.from({length:slots},(_,i)=>i);
  const bottom=type==='ligeiras'?.065:h*.12;
  const ys=levelIds.filter(i=>Number.isInteger(i)&&i>=0&&i<slots).map(i=>type==='racks'?rackLevels[i]:type==='bancadas'?h-workbenchLevelPosition(i,slots,0,h,topInset):type==='ligeiras'?lightLevels[i]:type==='picking'?slots===1?h*.5:bottom+i*(h-topInset-bottom)/Math.max(1,slots-1):slots===1?h*.5:Math.min(h-topInset,bottom+i*(h-bottom)/Math.max(1,slots-1)));
  const braced=bracedIndexes.includes(index);
  const braceCount=type==='ligeiras'&&braced?(braceCounts[index] ?? (h>=3&&(index===0||index===lengths.length-1)?3:2)):0;
  const horizontalBraces=lightBracePositions(h,braceCount);
  return {left,right,length,clearLength:right-left-upright,levels:ys,floorPallets:type==='racks'&&rackFloorFits(ys,rackPalletLayout(useRequirements,right-left-upright)?.loadHeight||0),palletLoad:type==='racks'?rackPalletLayout(useRequirements,right-left-upright):null,braced,horizontalBraces,centralSupports:pickingCentralCount(mm)};});
 return {useRequirements:normalizeRackUse(useRequirements),height:h,depth:d,width,upright,beamHeight,bays,type,galvanized,floorType,reinforcedBeams,shelfRibCount:type==='ligeiras'?(Number(depth)===600?2:Number(depth)===500?1:0):0};
}

export function shelfReinforcementPositions(bay,upright){
 const inset=.0125;
 const left=bay.left+upright/2+inset,right=bay.right-upright/2-inset;
 return {lateral:[left,right],central:Array.from({length:bay.centralSupports},(_,i)=>left+(right-left)*(i+1)/(bay.centralSupports+1))};
}
