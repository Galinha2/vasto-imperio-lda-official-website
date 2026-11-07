import {rackPalletLayout,rackPalletLabel} from '@/lib/rack-use-requirements.mjs';
export default function RackPalletDrawing({requirements,length,center,beamY,scale}){
 const load=rackPalletLayout(requirements,length/1000);if(!load)return null;
 const unit=1000*scale,w=load.width*unit,d=.144*unit;
 return <g pointerEvents="none" data-rack-pallets=""><title>{rackPalletLabel(requirements.pallet)}</title>{load.centres.map((offset,i)=>{
  const x=center+offset*unit-w/2;
  return <g key={i}>
   {load.loadHeight>.144&&<><rect x={x+.02*unit} y={beamY-load.loadHeight*unit} width={w-.04*unit} height={(load.loadHeight-.144)*unit} rx={Math.min(2,scale*10)} fill="#d4c6ae" stroke="#b2a18a" strokeWidth=".5"/><path d={`M ${x+w/2} ${beamY-load.loadHeight*unit} V ${beamY-d}`} stroke="#bcad96" strokeWidth=".6"/></>}
   <rect x={x} y={beamY-d} width={w} height={.022*unit} fill="#c4a377"/>
   <rect x={x} y={beamY-.022*unit} width={w} height={.022*unit} fill="#af8d60"/>
   {[-1,0,1].map((side,j)=><rect key={j} x={x+w/2+side*(w/2-.05*unit)-.05*unit} y={beamY-.122*unit} width={.1*unit} height={.1*unit} fill="#b99a6f"/>)}
  </g>;
 })}</g>;
}
