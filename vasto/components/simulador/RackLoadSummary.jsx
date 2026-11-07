'use client';
import {rackModel} from '@/lib/admin/rack-3d-model.mjs';
import {normalizeRackUse,rackPalletLayout,formatLoadHeight,rackPalletLabel} from '@/lib/rack-use-requirements.mjs';
export default function RackLoadSummary({value,modules=[],height,slots,levelsByModule,capacity,english=false}){
 const v=normalizeRackUse(value);if(!Object.values(v).some(Boolean))return null;
 const layouts=modules.map(length=>rackPalletLayout(v,length/1000));
 const tooMany=layouts.some(l=>l&&l.requested>l.fits),tooHeavy=layouts.some(l=>l&&l.weight*(l.requested||l.count)>Number(capacity));
 const model=height&&slots?rackModel({type:'racks',height,depth:1000,modules,slots,levelsByModule,useRequirements:v}):null;
 const heightConflict=model?.bays.some(b=>b.palletLoad&&b.levels.some((level,index)=>index<b.levels.length-1&&level+b.palletLoad.loadHeight>b.levels[index+1]-.1));
 const invalidHeight=layouts.some(l=>l?.heightTooSmall);
 const text=[rackPalletLabel(v.pallet,english),v.weight&&`${v.weight} kg / ${english?'pallet':'palete'}`,v.loadHeight&&`${formatLoadHeight(v.loadHeight,english)} m ${english?'loaded height':'com carga'}`,v.palletsPerLevel&&`${v.palletsPerLevel} ${english?'pallets/level requested':'paletes/nível pretendidas'}`].filter(Boolean).join(' · ');
 return <aside className="mx-4 my-4 rounded-[20px] border border-[#e5e5e7] bg-[#f8f9fb] p-4 text-xs leading-6 text-[#626268]" aria-label={english?'Load visualisation':'Visualização da carga'}><strong className="block text-[#424245]">{english?'Your storage requirements':'O que vai armazenar'}</strong><p>{text}</p>
 {v.protection&&<p>{english?'Yellow guards: requested options, not included in the estimate.':'Proteções amarelas: opções solicitadas, não incluídas na estimativa.'}</p>}
 {!layouts.some(Boolean)&&<p>{english?'Choose a standard pallet type to display it in the drawing.':'Escolha um tipo de palete normalizado para o visualizar no desenho.'}</p>}
 {tooMany&&<p className="font-semibold text-[#ad490c]">{english?'The requested quantity does not fit across every bay. Only the pallets that fit are shown.':'A quantidade pretendida não cabe em todos os módulos. O desenho mostra apenas as paletes que cabem.'}</p>}
 {invalidHeight&&<p className="font-semibold text-[#ad490c]">{english?'The loaded height must include the pallet itself (0.144 m).':'A altura com carga deve incluir a própria palete (0,144 m).'}</p>}
 {heightConflict&&<p className="font-semibold text-[#ad490c]">{english?'The indicated load height intersects the level above. Adjust the number of levels, rack height or load height.':'A altura da carga indicada interfere com o nível acima. Ajuste os níveis, a altura da rack ou a altura da carga.'}</p>}
 {tooHeavy&&<p className="font-semibold text-[#ad490c]">{english?'The indicated load exceeds the displayed capacity per beam pair. Review the configuration with the team.':'A carga indicada ultrapassa a capacidade apresentada por par de vigas. Reveja a configuração com a equipa.'}</p>}
 <p>{english?'Illustrative arrangement, subject to technical validation. Confirm load height, clearances, pallet support and floor anchoring.':'Disposição ilustrativa, sujeita a validação técnica. Confirme a altura da carga, as folgas, o apoio das paletes e a fixação ao pavimento.'}</p></aside>;
}
