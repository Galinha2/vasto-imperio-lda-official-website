'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { cartEntryTitle } from '@/lib/simulator-cart.mjs';
import budget from '@/assets/orcamento.json';
import { spaceCatalog } from '@/lib/space-catalog.mjs';
const loading = () => <p className="p-8 text-sm text-[#86868b]">A abrir configuração…</p>;
const Picking = dynamic(() => import('./SimulatorPicking'), {loading});
const Racks = dynamic(() => import('./SimulatorRacks'), {loading});
const Ligeiras = dynamic(() => import('./SimulatorEstantesLigeiras'), {loading});
const Space = dynamic(() => import('./SpacePlanner'), {loading});
export default function SimulatorCartEditor({entry, admin, onClose}) {
  const type = entry.simulatorType || (entry.label.includes('ligeiras') ? 'ligeiras' : entry.label.includes('Racks') ? 'racks' : entry.label.includes('Bancadas') ? 'bancadas' : 'picking');
  const isSpace = entry.configuration?.kind === 'space';
  const models = useMemo(() => isSpace ? spaceCatalog(budget.produtos) : [], [isSpace]);
  const metric = (label) => Number(entry.details.match(new RegExp(`${label}:\\s*([\\d.,]+)`))?.[1]?.replace(',', '.')) * 1000;
  const slots = Number(entry.details.match(/Níveis:\s*(\d+)/)?.[1]) || 4;
  const modules = {};
  const positions = entry.details.match(/posições[^:]*:\s*(.*?)\s+de\s+\d+/)?.[1];
  for (const part of positions?.split(';') || []) {
    const match = part.trim().match(/^(\d+):\s*([\d/]+)/);
    if (!match) continue;
    const active = match[2].split('/').map(Number);
    const removed = Array.from({length:slots},(_,i) => i).filter(i => !active.includes(i+1));
    if (removed.length) modules[Number(match[1])-1] = removed;
  }
  const initial = entry.configuration || {
    desiredLength:String(metric('Comprimento por fila') / 1000 || 1),
    height:metric('Altura') || undefined, depth:metric('Profundidade') || undefined,
    floorType:/Piso:\s*Metálica/.test(entry.details) ? 'Metálica' : 'Aglomerado',
    galvanized:!entry.details.includes('Bastidores: pintados'),
    reinforcedBeams:entry.details.includes('Vigas: Viga Z100'),
    levelsState:{slots,modules},
  };
  const configuration = {...initial, ...(entry.baseQuantity ? {rowCount:entry.quantity} : {})};
  const Component = type === 'ligeiras' ? Ligeiras : type === 'racks' ? Racks : Picking;
  return <div className="fixed inset-0 z-[950] overflow-y-auto bg-[#f5f5f7] p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="cart-edit-title" className="mx-auto max-w-[1600px] rounded-3xl bg-white p-4 sm:p-6"><header className="mb-5 flex items-center justify-between gap-4"><div><h2 id="cart-edit-title" className="text-xl font-semibold tracking-tight">Editar · {cartEntryTitle(entry)}</h2><p className="mt-1 text-xs text-[#86868b]">Altere as medidas e clique em “Guardar alterações no carrinho”.</p></div><button type="button" autoFocus onClick={onClose} className="cursor-pointer rounded-full border border-[#e5e5e7] px-4 py-2 text-sm transition hover:bg-[#f5f5f7]">Cancelar edição</button></header>{isSpace ? <Space models={models} initialType={initial.type} initialConfiguration={configuration} embedded /> : <Component initialConfiguration={configuration} adminMode variant={type === 'bancadas' ? 'workbench' : undefined} adminDiscountPercent={admin ? entry.discountPercent : null} />}</section></div>;
}
